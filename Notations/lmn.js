/* ============================================================
   LMN: lifting M-notation
============================================================ */

(function() {

    const LMN_compare = (x, y) => {
        if (x === 0) {
            return y === 0 ? 0 : -1;
        }

        if (y === 0) return 1;

        if (x[0]) {
            if (y[0]) {
                if (x[1] < y[1]) return -1;
                if (x[1] > y[1]) return 1;
                return LMN_compare(x[2], y[2]);
            } else {
                return LMN_compare(x, y[1]) <= 0 ? -1 : 1;
            }
        } else {
            if (y[0]) {
                return LMN_compare(x[1], y) < 0 ? -1 : 1;
            } else {
                const cmp = LMN_compare(x[1], y[1]);
                if (cmp) return cmp;
                return LMN_compare(x[2], y[2]);
            }
        }
    };

    const LMN_FS = (() => {
        const data = {};

        const Copy = x => typeof x === 'number'
            ? x
            : [x[0]].concat(x.slice(1).map(Copy));

        const maxsummand = x => {
            if (!x || x[0]) return x;

            const x1 = maxsummand(x[1]);
            const x2 = maxsummand(x[2]);

            return LMN_compare(x1, x2) < 0 ? x2 : x1;
        };

        const cut0 = x => x
            ? x[0]
                ? [true, x[1], cut0(x[2])]
                : x[2]
                    ? LMN_compare(x[1], maxsummand(x[2])) < 0
                        ? cut0(x[2])
                        : [false, cut0(x[1]), cut0(x[2])]
                    : cut0(x[1])
            : 0;

        const L = x => {
            let cur = x;
            const lx = [];

            while (cur) {
                if (cur[0]) {
                    lx.push(cur);
                    if ((cur = cur[2]) === 0) break;
                } else {
                    cur = cur[2];
                }
            }

            return lx;
        };

        const change = (x, y) => {
            const x1 = Copy(x);
            const lx = L(x1);
            const n = lx.length - 1;

            if (lx[n] === x1) return y;

            let prev = n ? lx[n - 1] : x1;
            while (prev[2] !== lx[n]) prev = prev[2];

            prev[2] = y;
            return x1;
        };

        const it = (x, n) => n ? change(x, it(x, n - 1)) : 0;

        const termtier = x => {
            let n = 0;
            for (; LMN_compare(x, [true, n + 1, 0]) >= 0; ++n);
            return n;
        };

        const inner = x => {
            const n = termtier(x);
            const Lx = L(x);
            const m = Lx.slice(1).findIndex(xj => termtier(xj) === n);

            if (m === -1) return 0;

            let A = Lx[m][2];

            while (!A[0]) {
                if (termtier(A) === n) return A;
                A = A[2];
            }

            return A[1] === n ? A : 0;
        };

        const iscritical = x => {
            const n = termtier(x);
            const lx = L(x);

            return lx.findIndex((xi, i) =>
                LMN_compare(x, xi) < 0 &&
                termtier(xi) === n &&
                lx.slice(i + 1).every(xj => LMN_compare(xj, [true, n + 1, 0]) >= 0) &&
                lx.slice(0, i).every(xj => LMN_compare(xj, [true, n, 0]) >= 0)
            ) >= 0;
        };

        const subtract = (c, b) => {
            if (b === 0) return c;
            if (c === 0) return 0;

            const b1 = b[0] ? b : b[1];
            const c1 = c[0] ? c : c[1];
            const cmp = LMN_compare(b1, c1);

            if (cmp < 0) return c;
            if (cmp > 0) return 0;

            return subtract(c[0] ? 0 : c[2], b[0] ? 0 : b[2]);
        };

        const lift = (x, a, s) => {
            if (x === 0 || x[0] && LMN_compare(x, a) < 0) return x;

            if (!x[0]) {
                return [false].concat(x.slice(1).map(xi => lift(xi, a, s)));
            }

            if (a[1] < x[1]) {
                return [true, x[1] - a[1] + s[1], lift(x[2], a, s)];
            }

            return [
                true,
                s[1],
                cut0([false, s[2], lift(subtract(x[2], a[2]), a, s)])
            ];
        };

        const isone = x => String(x) === String([true, 0, 0]);

        const LMN_FS_inner = (x, FSterm) => {
            let i, res, x2, xn1, prev;

            if (String(x) === 'true,Infinity') {
                res = 0;
                for (i = FSterm; i >= 0; --i) {
                    res = [true, i, res];
                }
                return [true, 0, res];
            }

            if (x === 0) return 0;

            if (!x[0]) {
                x2 = x[2];

                if (isone(x2)) {
                    return x[1];
                } else {
                    return cut0(x.slice(0, 2).concat([LMN_FS_inner(x2, FSterm)]));
                }
            }

            x2 = Copy(x);

            const lx = L(x2);
            const xn = lx[lx.length - 1];

            if (isone(xn)) {
                xn1 = lx[lx.length - 2];

                if (xn1[2] === xn) {
                    xn1[2] = 0;
                } else {
                    prev = xn1;
                    while (prev[2][2] !== xn) prev = prev[2];
                    prev[2] = prev[2][1];
                }

                if (x2 === xn1) {
                    res = 0;
                    for (i = FSterm; i--;) {
                        res = [false, Copy(xn1), res];
                    }
                    return cut0(res);
                } else {
                    prev = lx.length === 2 ? x2 : lx[lx.length - 3];
                    while (prev[2] !== xn1) prev = prev[2];

                    prev[2] = 0;

                    for (i = FSterm; i--;) {
                        prev[2] = [false, Copy(xn1), prev[2]];
                    }

                    return cut0(x2);
                }
            }

            const j = xn[1];
            const lxr = lx.slice().reverse();
            const xk = lxr.find(xz => termtier(xz) === j - 1);
            const xi = lxr.find(iscritical);
            const s = termtier(xi);

            if (s === j - 1) {
                if (LMN_compare(xi, change(xk, xk)) >= 0) {
                    prev = x2;
                    while (prev[2] !== xk) prev = prev[2];

                    prev[2] = [true, 0, 0];

                    if (x2 === xi) {
                        return cut0(it(xi, FSterm));
                    }

                    prev = x2;
                    while (prev[2] !== xi) prev = prev[2];

                    prev[2] = it(xi, FSterm);
                    return cut0(x2);
                }

                return cut0(change(x2, it(inner(xi), FSterm)));
            }

            const xj = lxr.find(xz => termtier(xz) === s);

            return LMN_FS_inner(
                cut0(change(x2, lift(inner(xi), xj, xk))),
                FSterm
            );
        };

        return (x, FSterm) => {
            const datakey = String(x);

            if (!data[datakey]) {
                data[datakey] = [];
            } else if (data[datakey][FSterm] !== undefined) {
                return data[datakey][FSterm];
            }

            return data[datakey][FSterm] = LMN_FS_inner(x, FSterm);
        };
    })();

    /* ------------------------------
    LMN 坏根辅助函数
    注意：这些函数是给 getBadRootIndex 用的，
    因为原程序里的 L / termtier / iscritical 在 LMN_FS 闭包内部。
    ------------------------------ */

    function LMN_L_plain(x) {
        let cur = x;
        const lx = [];

        while (cur) {
            if (cur[0]) {
                lx.push(cur);
                if ((cur = cur[2]) === 0) break;
            } else {
                cur = cur[2];
            }
        }

        return lx;
    }

    function LMN_termtier(x) {
        let n = 0;

        for (; LMN_compare(x, [true, n + 1, 0]) >= 0; ++n);

        return n;
    }

    function LMN_iscritical(x) {
        const n = LMN_termtier(x);
        const lx = LMN_L_plain(x);

        return lx.findIndex((xi, i) =>
            LMN_compare(x, xi) < 0 &&
            LMN_termtier(xi) === n &&
            lx.slice(i + 1).every(xj =>
                LMN_compare(xj, [true, n + 1, 0]) >= 0
            ) &&
            lx.slice(0, i).every(xj =>
                LMN_compare(xj, [true, n, 0]) >= 0
            )
        ) >= 0;
    }

    /* ------------------------------
       2. 简写表达式 parser
    ------------------------------ */

    function tokenizeLMN(s) {
        const tokens = [];
        let i = 0;

        while (i < s.length) {
            const ch = s[i];

            if (/\s/.test(ch)) {
                i++;
                continue;
            }

            if (ch === '+' || ch === '(' || ch === ')') {
                tokens.push({ type: ch });
                i++;
                continue;
            }

            if (/\d/.test(ch)) {
                let numStr = '';

                while (i < s.length && /\d/.test(s[i])) {
                    numStr += s[i];
                    i++;
                }

                tokens.push({
                    type: 'number',
                    value: parseInt(numStr, 10)
                });

                continue;
            }

            throw new Error(`非法字符: ${ch}`);
        }

        return tokens;
    }

    function parseTermLMN(tokens, pos) {
        if (pos >= tokens.length) {
            throw new Error('表达式不完整，期待数字');
        }

        const tok = tokens[pos];

        if (tok.type !== 'number') {
            throw new Error(`期待数字，得到 ${tok.type}`);
        }

        const n = tok.value;
        pos++;

        if (pos < tokens.length && tokens[pos].type === '(') {
            pos++;
            const parsed = parseExprLMN(tokens, pos);

            if (
                parsed.next >= tokens.length ||
                tokens[parsed.next].type !== ')'
            ) {
                throw new Error('缺少右括号 )');
            }

            return {
                expr: [true, n, parsed.expr],
                next: parsed.next + 1
            };
        }

        return {
            expr: [true, n, 0],
            next: pos
        };
    }

    function parseExprLMN(tokens, pos) {
        const first = parseTermLMN(tokens, pos);
        let left = first.expr;
        let next = first.next;

        if (next < tokens.length && tokens[next].type === '+') {
            next++;
            const right = parseExprLMN(tokens, next);

            return {
                expr: [false, left, right.expr],
                next: right.next
            };
        }

        return {
            expr: left,
            next
        };
    }

    function parseShortLMN(str) {
        const tokens = tokenizeLMN(str);
        const parsed = parseExprLMN(tokens, 0);

        if (parsed.next < tokens.length) {
            throw new Error(`多余的内容: 位置 ${parsed.next}`);
        }

        return parsed.expr;
    }

    /* ------------------------------
       3. tree <-> token pairs
    ------------------------------ */

    function exprToPairs(expr, depth = 0, out = []) {
        // 注意：
        // 原工具里 0 和 ψ_0(0) 的简写都显示成 0。
        // 这里为了可点击序列，统一把 0 显示成一个 0-token。
        if (expr === 0) {
            out.push({ depth, value: 0 });
            return out;
        }

        if (expr[0] === true) {
            out.push({
                depth,
                value: expr[1]
            });

            if (expr[2] !== 0) {
                exprToPairs(expr[2], depth + 1, out);
            }

            return out;
        }

        exprToPairs(expr[1], depth, out);
        exprToPairs(expr[2], depth, out);

        return out;
    }

    function pairsToExpr(pairs) {
        if (!pairs || pairs.length === 0) return 0;

        const normalized = pairs.map(p => ({
            depth: p.depth,
            value: p.value
        }));

        const built = buildFromPairsLMN(normalized, 0, normalized[0].depth);

        return built.expr;
    }

    function buildFromPairsLMN(pairs, start, expectedDepth) {
        let i = start;
        const items = [];

        while (i < pairs.length && pairs[i].depth === expectedDepth) {
            const cur = pairs[i];
            const value = cur.value;

            if (
                i + 1 < pairs.length &&
                pairs[i + 1].depth === expectedDepth + 1
            ) {
                const child = buildFromPairsLMN(
                    pairs,
                    i + 1,
                    expectedDepth + 1
                );

                items.push([true, value, child.expr]);
                i = child.nextIndex;
            } else {
                items.push([true, value, 0]);
                i++;
            }
        }

        if (items.length === 0) {
            return {
                expr: 0,
                nextIndex: i
            };
        }

        let expr = items[items.length - 1];

        for (let j = items.length - 2; j >= 0; j--) {
            expr = [false, items[j], expr];
        }

        return {
            expr,
            nextIndex: i
        };
    }

    function toShortLMN(x) {
        if (x === 0) return '0';

        if (x[0] === true) {
            const n = x[1];
            const arg = x[2];

            if (arg === 0) {
                return String(n);
            }

            return String(n) + '(' + toShortLMN(arg) + ')';
        }

        const parts = [];
        let cur = x;

        while (cur && cur[0] === false) {
            parts.push(cur[1]);
            cur = cur[2];
        }

        if (cur !== 0) {
            parts.push(cur);
        }

        return parts.map(toShortLMN).join('+');
    }

    function annotatePairsLMN(rawPairs, options = {}) {
        const limitMode = options.limitMode === true;

        const pairs = rawPairs.map((p, i) => ({
            type: 'lmn-token',
            depth: p.depth,
            value: p.value,
            limitMode,
            index: i
        }));

        for (let i = 0; i < pairs.length; i++) {
            const cur = pairs[i];
            const prev = i > 0 ? pairs[i - 1] : null;
            const next = i + 1 < pairs.length ? pairs[i + 1] : null;

            let prefix = '';

            if (prev && cur.depth <= prev.depth) {
                prefix += '+';
            }

            let suffix = '';

            if (next && next.depth > cur.depth) {
                suffix += '(';
            } else if (!next && limitMode) {
                // 极限表达式有限前缀最后一项后面开括号，
                // 让后面的 ... 放在里面。
                suffix += '(';
            } else if (next) {
                const closeCount = cur.depth - next.depth;
                if (closeCount > 0) {
                    suffix += ')'.repeat(closeCount);
                }
            } else {
                if (cur.depth > 0) {
                    suffix += ')'.repeat(cur.depth);
                }
            }

            cur.text = prefix + String(cur.value) + suffix;
        }

        return pairs;
    }

    function rawPairs(seq) {
        return seq.map(t => ({
            depth: t.depth,
            value: t.value
        }));
    }

    function countLMNPairs(x) {
        if (x === 0) return 1;
    
        if (x[0] === true) {
            return 1 + (x[2] === 0 ? 0 : countLMNPairs(x[2]));
        }
    
        return countLMNPairs(x[1]) + countLMNPairs(x[2]);
    }
    
    function isLMNOne(x) {
        return String(x) === String([true, 0, 0]);
    }
    
    // 带 token 下标的 L(x)
    // L(x) 本来只返回右脊上的 term；这里同时记录它们在 exprToPairs 顺序里的下标。
    function LMN_L_withIndex(x, startIndex = 0) {
        let cur = x;
        let curIndex = startIndex;
        const lx = [];
    
        while (cur) {
            if (cur[0]) {
                lx.push({
                    node: cur,
                    index: curIndex
                });
    
                if (cur[2] === 0) break;
    
                // term 的参数紧跟在 term token 后面
                cur = cur[2];
                curIndex = curIndex + 1;
            } else {
                // sum 的右侧在左侧所有 token 后面
                const leftCount = countLMNPairs(cur[1]);
                cur = cur[2];
                curIndex = curIndex + leftCount;
            }
        }
    
        return lx;
    }
    
    // 按原 LMN_FS_inner 的分支逻辑寻找坏根 token 下标
    function getLMNBadRootIndexFromExpr(x, startIndex = 0) {
        // 纯 0 没有可展开坏根
        if (x === 0) return -1;
    
        // 和式：原程序对右侧 x[2] 继续展开
        if (!x[0]) {
            const leftCount = countLMNPairs(x[1]);
            const x2 = x[2];
    
            // if (isone(x2)) return x[1]
            // 这里实际被消去的是右侧这个 1
            if (isLMNOne(x2)) {
                return startIndex + leftCount;
            }
    
            return getLMNBadRootIndexFromExpr(x2, startIndex + leftCount);
        }
    
        // term 情况
        const lx = LMN_L_withIndex(x, startIndex);
        if (lx.length === 0) return -1;
    
        const xnInfo = lx[lx.length - 1];
        const xn = xnInfo.node;
    
        // 原程序：
        // if (isone(xn)) { ... }
        // 此时坏根就是这个最终的 1
        if (isLMNOne(xn)) {
            return xnInfo.index;
        }
    
        // 原程序 critical 分支：
        //
        // var j = xn[1],
        //     lxr = lx.slice(),
        //     xk = lxr.reverse().find(...),
        //     xi = lxr.find(iscritical),
        //     s = termtier(xi)
        //
        // 注意原代码先 reverse，再 find(iscritical)，
        // 所以这里也要照着做。
        const lxr = lx.slice().reverse();
    
        const xiInfo = lxr.find(info => LMN_iscritical(info.node));
    
        if (!xiInfo) return -1;
    
        // critical 分支的坏根就是 xi
        return xiInfo.index;
    }
    
    function isLMNTokenSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            seq[0] &&
            seq[0].type === 'lmn-token';
    }

    function parseLMNToTokens(input) {
        const expr = parseShortLMN(input);
        return annotatePairsLMN(exprToPairs(expr));
    }

    function sameLMNPair(a, b) {
        return a &&
            b &&
            a.depth === b.depth &&
            a.value === b.value;
    }
    
    function commonPrefixLengthLMN(a, b) {
        const n = Math.min(a.length, b.length);
        let i = 0;
    
        while (i < n && sameLMNPair(a[i], b[i])) {
            i++;
        }
    
        return i;
    }
    
    function splitLMNSuffixGroups(tokens, start) {
        const groups = [];
    
        if (!tokens || start >= tokens.length) return groups;
    
        let i = start;
    
        while (i < tokens.length) {
            const baseDepth = tokens[i].depth;
            const group = [tokens[i]];
            i++;
    
            while (i < tokens.length && tokens[i].depth > baseDepth) {
                group.push(tokens[i]);
                i++;
            }
    
            groups.push(group);
        }
    
        return groups;
    }

    /* ------------------------------
       4. 极限表达式
    ------------------------------ */

    function makeLMNLimitSeq(length) {
        // 0(0(1(2(3(...)))))
        //
        // depth:  0 1 2 3 4 ...
        // value: 0 0 1 2 3 ...
        const pairs = [];

        for (let i = 0; i < length; i++) {
            pairs.push({
                depth: i,
                value: i < 2 ? 0 : i - 1
            });
        }

        return annotatePairsLMN(pairs, { limitMode: true });
    }

    function isLMNLimitSeq(seq) {
        return isLMNTokenSeq(seq) && seq.some(t => t.limitMode);
    }

    /* ------------------------------
       5. 注册 LMN
    ------------------------------ */

    registerNotation({
        id: 'lmn',
        name: 'LMN',
        placeholder: '例如：0(0(1+1+1))',
        defaultTimes: 3,
        lexDesc: true,

        // LMN 也是紧凑显示：
        // token 是数字节点，但括号和 + 贴在 token 上。
        compactTokens: true,

        parse(input) {
            return parseLMNToTokens(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            const expr = pairsToExpr(rawPairs(seq));
            return toShortLMN(expr);
        },

        formatToken(token) {
            return token.text;
        },

        // LMN 的 +、括号都已经包含在 token.text 里，
        // 所以 token 之间不再额外加分隔符。
        separator() {
            return '';
        },

        getTokenGroupKey(token, index) {
            // LMN 每个数字就是一个点击单位。
            return index;
        },

        compareSeq(a, b) {
            const ea = pairsToExpr(rawPairs(a));
            const eb = pairsToExpr(rawPairs(b));

            return LMN_compare(ea, eb);
        },

        getBadRootIndex(seq) {
            try {
                const expr = pairsToExpr(rawPairs(seq));
                return getLMNBadRootIndexFromExpr(expr);
            } catch {
                return -1;
            }
        },

        expand(seq, times) {
            const expr = pairsToExpr(rawPairs(seq));
        
            const badRootIndex = getLMNBadRootIndexFromExpr(expr);
        
            const expanded = LMN_FS(expr, times);
            const result = annotatePairsLMN(exprToPairs(expanded));
        
            const goodLength = commonPrefixLengthLMN(seq, result);
            const groups = splitLMNSuffixGroups(result, goodLength);
        
            return {
                result,
                goodLength,
                groups,
                badRootIndex
            };
        },

        // LMN 极限表达式会显示为：
        // 0(0(1(2(3(4...)))))
        formatEllipsis(seq) {
            if (!seq || seq.length === 0) return '...';

            const last = seq[seq.length - 1];

            if (!last || !last.limitMode) return '...';

            // 最后一项 token.text 末尾已经添加了一个 '('，
            // 所以这里需要关闭 depth + 1 层括号。
            return '...' + ')'.repeat(last.depth + 1);
        },

        limit: {
            initial() {
                // 初始显示：
                // 0(0(1(2(3(4...)))))
                return makeLMNLimitSeq(6);
            },

            extend(seq) {
                return makeLMNLimitSeq(seq.length + 1);
            },

            // 极限表达式选择逻辑：
            // 点击某个数字，直接选择到该数字为止的有限嵌套表达式。
            //
            // 例如点击 3：
            // 0(0(1(2(3))))
            select(seq, index) {
                const selectedRaw = rawPairs(seq.slice(0, index + 1));
                return annotatePairsLMN(selectedRaw);
            }
        }
    });
})();