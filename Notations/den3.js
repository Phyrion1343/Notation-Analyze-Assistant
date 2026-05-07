/* ============================================================
   DEN3
============================================================ */

(function() {
    function deepCopyExpr(expr) {
        if ('' + expr === 'Infinity') return Infinity;

        return expr.map(row => {
            return [row[0]].concat(
                row.slice(1).map(x => [x[0], !!x[1]])
            );
        });
    }

    function sequence_compare(a, b) {
        const n = Math.min(a.length, b.length);

        for (let i = 0; i < n; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }

        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    function toShort(expr) {
        return expr.map(row =>
            row
                .slice(1, -row[0])
                .concat([row[row.length - 1]])
                .map(x => x[0])
        );
    }

    function seqseq_compare(m1, m2) {
        if (m1.length === 0) {
            return m2.length === 0 ? 0 : -1;
        }

        if (m2.length === 0) {
            return 1;
        }

        const cmp = sequence_compare(m1[0], m2[0]);

        if (cmp) return cmp;

        return seqseq_compare(m1.slice(1), m2.slice(1));
    }

    function compareDEN3(expr1, expr2) {
        if ('' + expr1 === 'Infinity') {
            return '' + expr2 === 'Infinity' ? 0 : 1;
        }

        if ('' + expr2 === 'Infinity') {
            return -1;
        }

        return seqseq_compare(toShort(expr1), toShort(expr2));
    }

    function displayDEN3(expr) {
        if ('' + expr === 'Infinity') return 'Limit';

        return expr.map(row => {
            const body = row
                .slice(1)
                .map(x => (x[1] ? '*' : '') + x[0])
                .join(',');

            return '(' + body + ')' + row[0];
        }).join('');
    }

    function displayRow(row) {
        const body = row
            .slice(1)
            .map(x => (x[1] ? '*' : '') + x[0])
            .join(',');

        return '(' + body + ')' + row[0];
    }

    function values(row) {
        return [row[0]].concat(row.slice(1).map(x => x[0]));
    }

    function isNonzero(expr) {
        return Array.isArray(expr) && expr.length > 0;
    }

    function pleasantUntil(rows, t) {
        const tcheck = values(t).slice(1 + t[0]);
        const tmax = tcheck[0];
        const tmin = tcheck[tcheck.length - 1];

        let scheck;
        let i1;
        let i2;

        for (let n = 0; n < rows.length; n++) {
            scheck = values(rows[n]).slice(1);
            i1 = scheck.findIndex(x => x < tmax);
            i2 = scheck.findLastIndex(x => x > tmin);

            if (
                ~i1 &&
                ~i2 &&
                i1 <= i2 &&
                scheck.slice(i1, i2 + 1).some(x => !tcheck.includes(x))
            ) {
                return n;
            }
        }

        return -1;
    }

    function isLimitDEN3(expr) {
        if ('' + expr === 'Infinity') return true;
        if (!Array.isArray(expr) || expr.length === 0) return false;

        const active = expr[expr.length - 1];

        if (!(active[1 + active[0]]?.[0])) return false;

        return pleasantUntil(
            expr.slice(active[1 + active[0]][0] - 1, -1),
            active
        ) === -1;
    }

    // 这里用于“计数序列”的后继判断。
    // DEN3 的 active 行如果没有 active[1+L]，旧版 expand 会直接 cut，
    // 因此这里视作后继。
    function isSuccessorDEN3(expr) {
        if (!Array.isArray(expr) || expr.length === 0) return true;

        const active = expr[expr.length - 1];

        return !(active[1 + active[0]]?.[0]);
    }

    function cut(expr) {
        return expr
            .slice(0, -1)
            .map(row => [row[0]].concat(row.slice(1).map(x => x.slice())));
    }

    function seqFrom(expr, i, j) {
        let row = expr[i];
        let val = row[j][0];
        const threshold = row[j + row[0]]?.[0] ?? 0;

        let idx;
        const record = [[i + 1, j], [val]];

        if (!threshold) return;

        while (val > threshold) {
            row = expr[val - 1];
            idx = 1 + row[0];
            record[record.length - 1][1] = idx;
            val = row[idx]?.[0];
            record.push([val]);
        }

        if (val !== threshold) return;

        return record.slice(1, -1);
    }

    function apv(s, t) {
        return s.map(x =>
            x < t[t.length - 1]
                ? x
                : x >= t[1 + t[0]]
                    ? x - t[1 + t[0]] + t[1]
                    : t[t.lastIndexOf(x) - t[0]]
        );
    }

    function ap(s, t) {
        return [s[0]].concat(
            apv(values(s).slice(1), values(t)).map(x => [x])
        );
    }

    function copy(raw, flag) {
        const active = raw[raw.length - 1];
        let expr = cut(raw);

        const begin = active[1 + active[0]][0];
        const a1 = active[active.length - 1][0];
        const end = ~flag ? active[1 + active[0]][0] + flag : raw.length + 1;
        const offset = raw.length - begin;

        expr = expr.concat(
            raw
                .slice(begin - 1, end - 1)
                .map(row => ap(row, active))
        );

        let row;
        let targetrow;
        let seq;

        for (let i = begin - 1; i < end - 1; ++i) {
            row = raw[i];
            targetrow = expr[i + offset];

            for (let j = 1; j < row.length; ++j) {
                if (!row[j][1]) continue;

                seq = seqFrom(expr, i + offset, j);
                if (!seq) continue;

                const nomove = seq.findIndex(x => x[0] < begin);

                if (nomove === -1) {
                    targetrow[j][1] = true;
                    continue;
                }

                const y0 = seq[nomove][0];

                if (y0 < a1) {
                    targetrow[j][1] = true;
                    continue;
                }

                const k = 1 + active.slice(1).findIndex(x => x[0] === y0);

                if (
                    active[k - active[0]]?.[1] &&
                    !(targetrow[j + targetrow[0] - 1]?.[0] > a1)
                ) {
                    targetrow[j][1] = true;
                }
            }
        }

        return expr;
    }

    function compTo(raw, r, Rec) {
        let expr = raw.map(row =>
            [row[0]].concat(row.slice(1).map(x => x.slice()))
        );

        for (let i = raw[r].length - 1; i > 0; --i) {
            if (!raw[r][i][1]) continue;

            const bi = raw[r][i][0];
            const seq = seqFrom(expr, r, i);

            if (!seq) continue;

            const t = seq[seq.length - 1][0];
            const T = Rec[t - 1];

            if (!T) continue;

            for (let j = 0; j + 1 < seq.length; ++j) {
                if (!(expr[seq[j + 1][0] - 1].some(x => x[0] === seq[j][0] + 1))) {
                    continue;
                }
            }

            const q = T.length;

            const entries = expr[r]
                .slice(1)
                .map(x => x.slice())
                .concat(T.map(x => [x]))
                .concat(Array(q).fill(0).map((x, uu) => [bi + 1 + uu, true]));

            entries.sort((x, y) => y[0] - x[0]);

            expr[r] = [expr[r][0] + q].concat(entries);
        }

        return expr;
    }

    function compFrom(raw, r, T) {
        let expr = raw
            .slice(0, r)
            .map(row => [row[0]].concat(row.slice(1).map(x => x.slice())));

        const q = T.length;

        const lr = raw[r].length < raw[r][0] * 2 + 1
            ? raw[r][0]
            : raw[r][0] + 1;

        const cr = raw[r].length < raw[r][0] * 2 + 1
            ? raw[r].slice(1, -raw[r][0]).concat(raw[r].slice(1 + raw[r][0]))
            : raw[r].slice(1);

        let entries;

        for (let qq = 0; qq < q; ++qq) {
            entries = cr
                .map(x => x.slice())
                .concat(T.slice(0, 1 + qq).map(x => [x]))
                .concat(Array(qq).fill(0).map((x, uu) => [raw[r][1][0] + 1 + uu]));

            entries.sort((x, y) => y[0] - x[0]);

            expr[r + qq] = [lr + qq].concat(entries);
        }

        entries = raw[r]
            .slice(1)
            .map(x => x.slice())
            .concat(T.map(x => [x]))
            .concat(Array(q).fill(0).map((x, uu) => [raw[r][1][0] + 1 + uu]));

        entries.sort((x, y) => y[0] - x[0]);

        expr[r + q] = [raw[r][0] + q].concat(entries);

        for (let qq = 1; qq <= q; ++qq) {
            for (let uu = 2; uu <= 1 + qq; ++uu) {
                expr[r + qq][uu][1] = true;
            }
        }

        const m = (x, idx) => {
            if (!idx) return x;

            const xx = x.slice();
            xx[0] += xx[0] <= raw[r][1][0] ? 0 : q;

            return xx;
        };

        expr = expr.concat(raw.slice(r + 1).map(row => row.map(m)));

        return expr;
    }

    function expandDEN3Core(raw, FSterm, longer) {
        if ('' + raw === 'Infinity') {
            return LimitDEN3(FSterm);
        }

        if (!Array.isArray(raw) || !raw.length) return [];

        const active = raw[raw.length - 1];

        if (!(active[1 + active[0]]?.[0])) {
            return cut(raw);
        }

        const flag = pleasantUntil(
            raw.slice(active[1 + active[0]][0] - 1, -1),
            active
        );

        let expr = deepCopyExpr(raw);

        if (~flag) {
            expr = copy(expr, flag);
        } else {
            for (let n = 1; n <= FSterm; ++n) {
                expr = copy(expr, flag);
            }

            if (longer) {
                var len0 = expr.length;
                expr = copy(expr, 1);
            } else {
                expr = cut(expr);
            }
        }

        const Rec = [];

        for (let r = raw.length - 1; r < expr.length; ++r) {
            expr = compTo(expr, r, Rec);

            if (!(expr[r].length <= expr[r][0] * 2 + 1)) continue;

            const row = expr[r];
            const pr = row[1 + row[0]][0];

            let T = [row[row[0]][0]];

            do {
                T.unshift(expr[T[0] - 1][2][0]);
            } while (T[0] > pr);

            T = T.slice(1, -1);

            if (T.length < 1) continue;

            Rec[r] = T;

            expr = compFrom(expr, r, T);
            r += T.length;
        }

        if (longer) {
            while (expr.length > len0) {
                expr = cut(expr);
            }
        }

        return expr;
    }

    function LimitRowDEN3(n) {
        return Array(3 + n)
            .fill(0)
            .map((x, nn) =>
                3 <= nn && nn < 2 + n
                    ? [nn, true]
                    : [nn]
            )
            .concat(2)
            .reverse();
    }

    function LimitDEN3(n) {
        return [
            [1, [1], [0]],
            [1, [2], [1], [0]]
        ].concat(
            Array(n)
                .fill(0)
                .map((x, nn) => LimitRowDEN3(1 + nn))
        );
    }

    function drawDiagramDEN3(expr) {
        if ('' + expr === 'Infinity') {
            return undefined;
        }
    
        if (!Array.isArray(expr)) {
            return undefined;
        }
    
        const width = expr.length * 200 + 400;
        const height = expr.length * 200 + 150;
    
        const result = {
            width,
            height,
            actions: [
                { type: 'lineWidth', value: 15 },
                { type: 'strokeStyle', value: 'black' },
                { type: 'font', size: 120, font: 'Consolas' },
                { type: 'fillStyle', value: 'white' },
                { type: 'fillRect', value: { x: 0, y: 0, w: width, h: height } },
                { type: 'strokeRect', value: { x: 0, y: 0, w: width, h: height } },
                { type: 'fillStyle', value: 'black' }
            ]
        };
    
        for (let i = 0; i < expr.length; ++i) {
            const row = expr[i];
    
            let prev = undefined;
    
            for (let j = 1; j < row.length; ++j) {
                const pos = row[j][0];
                const mark = row[j][1];
    
                result.actions.push({
                    type: 'circle',
                    center: {
                        x: pos * 200 + 100,
                        y: i * 200 + 100
                    },
                    radius: 50,
                    fill: mark
                });
    
                if (prev !== undefined) {
                    result.actions.push({
                        type: 'line',
                        start: {
                            x: pos * 200 + 150,
                            y: i * 200 + 100
                        },
                        end: {
                            x: prev * 200 + 50,
                            y: i * 200 + 100
                        }
                    });
                }
    
                prev = pos;
            }
    
            result.actions.push({
                type: 'text',
                value: String(row[0]),
                pos: {
                    x: i * 200 + 400,
                    y: i * 200 + 150
                }
            });
        }
    
        for (let i = 0; i <= expr.length; ++i) {
            result.actions.push({
                type: 'text',
                value: String(i),
                pos: {
                    x: i * 200 + 100,
                    y: expr.length * 200 + 100
                },
                h_center: true
            });
        }
    
        return result;
    }

    function parseDEN3(str) {
        let t = String(str).trim();
    
        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');
    
        t = t.replace(/\s+/g, '');
    
        if (t === 'Limit' || t === 'Infinity') {
            return Infinity;
        }
    
        if (!t) {
            throw new Error('请输入 DEN3 表达式，例如：(1,0)1(2,1,0)1');
        }
    
        const rows = [];
        let i = 0;
    
        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('DEN3 格式错误，例如：(1,0)1(2,1,0)1');
            }
    
            const close = t.indexOf(')', i + 1);
    
            if (close === -1) {
                throw new Error('DEN3 缺少右括号');
            }
    
            const body = t.slice(i + 1, close);
    
            let j = close + 1;
    
            if (j >= t.length || !/[0-9]/.test(t[j])) {
                throw new Error('DEN3 每个括号后面必须跟行长 L，例如：(1,0)1');
            }
    
            while (j < t.length && /[0-9]/.test(t[j])) {
                j++;
            }
    
            const L = Number(t.slice(close + 1, j));
    
            if (!Number.isInteger(L) || L < 0) {
                throw new Error('DEN3 行长 L 必须是非负整数');
            }
    
            const entries = [];
    
            if (body.trim() !== '') {
                const parts = body.split(',');
    
                for (let part of parts) {
                    let s = part.trim();
                    let mark = false;
    
                    if (s.startsWith('*')) {
                        mark = true;
                        s = s.slice(1);
                    }
    
                    if (!/^-?\d+$/.test(s)) {
                        throw new Error('DEN3 行中包含无效数字');
                    }
    
                    entries.push([Number(s), mark]);
                }
            }
    
            rows.push([L].concat(entries));
    
            i = j;
        }
    
        return rows;
    }

    registerNotation({
        id: 'DEN3',
        name: 'DEN3(iBLP)',
        placeholder: '例如：(1,0)1(2,1,0)1',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return parseDEN3(input);
        },

        format(seq) {
            return displayDEN3(seq);
        },

        formatToken(token) {
            return displayRow(token);
        },

        separator(curr, next) {
            return '';
        },

        compareSeq(a, b) {
            return compareDEN3(a, b);
        },

        getBadRootIndex(seq) {
            if (!Array.isArray(seq) || seq.length === 0) return -1;
            if (isSuccessorDEN3(seq)) return -1;
        
            const activeIndex = seq.length - 1;
            const active = seq[activeIndex];
        
            if (!active || typeof active[0] !== 'number') return -1;
        
            const L = active[0];
        
            // DEN3 坏根：
            // 从当前项开始往左第 L 项。
            //
            // 例如：
            // index 3 的 (4,3,2)1，L=1 -> 3 - 1 = 2
            // index 4 的 (5,4,3,2)2，L=2 -> 4 - 2 = 2
            const badIndex = activeIndex - L;
        
            if (badIndex < 0 || badIndex >= seq.length) return -1;
        
            return badIndex;
        },

        isSuccessor(seq) {
            return isSuccessorDEN3(seq);
        },

        expand(seq, times) {
            const raw = deepCopyExpr(seq);
            const result = expandDEN3Core(raw, times, false);

            const good = Array.isArray(seq) ? cut(seq) : [];

            // 尽量按每个 FSterm 分组。
            // DEN3 原算法内部没有直接暴露每轮 copy 的分组，
            // 所以这里用相邻 FSterm 结果的长度差做近似分组。
            const groups = [];
            let prevLen = good.length;

            for (let k = 1; k <= times; k++) {
                const kth = expandDEN3Core(deepCopyExpr(seq), k, false);
                groups.push(kth.slice(prevLen));
                prevLen = kth.length;
            }

            return {
                result,
                goodLength: good.length,
                groups,
                badRootIndex: this.getBadRootIndex(seq)
            };
        },

        // 可选：如果你之后想把 FSalter 接到某个按钮，可以调用这个。
        expandAlter(seq, times) {
            const raw = deepCopyExpr(seq);
            return expandDEN3Core(raw, times, true);
        },

        drawDiagram(seq) {
            return drawDiagramDEN3(seq);
        },

        limit: {
            initial() {
                return LimitDEN3(2);
            },
        
            extend(seq) {
                const nextN = seq.length - 1;
        
                return [
                    ...deepCopyExpr(seq),
                    LimitRowDEN3(nextN)
                ];
            },
        
            select(seq, index) {
                return deepCopyExpr(seq.slice(0, index + 1));
            }
        }
    });
})();