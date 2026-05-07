/* ============================================================
   MTωMN / Mutant transfinite ωMN
============================================================ */

(function() {
    function deepClone(x) {
        return JSON.parse(JSON.stringify(x));
    }

    function isLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'mtwmn-limit-item';
    }

    function isLimitSeq(seq) {
        return Array.isArray(seq)
            && seq.length > 0
            && isLimitItem(seq[0]);
    }

    function isMTWMNTokenSeq(seq) {
        return Array.isArray(seq)
            && seq.length > 0
            && typeof seq[0] === 'object'
            && seq[0] !== null
            && seq[0].type === 'mtwmn-token';
    }

    function entryCompare(a, b) {
        if (a[0] < b[0]) return -1;
        if (a[0] > b[0]) return 1;
        return separatorCompare(a[1], b[1]);
    }

    function columnCompare(a, b) {
        let i = 0;

        while (true) {
            if (i >= a.length) {
                if (i >= b.length) return 0;
                return -1;
            }

            if (i >= b.length) return 1;

            const c = entryCompare(a[i], b[i]);
            if (c) return c;

            i++;
        }
    }

    function mountainCompare(a, b) {
        let i = 0;

        while (true) {
            if (i >= a.length) {
                if (i >= b.length) return 0;
                return -1;
            }

            if (i >= b.length) return 1;

            const c = columnCompare(a[i], b[i]);
            if (c) return c;

            i++;
        }
    }

    const separatorCompare = mountainCompare;

    function mountainIsLimit(m) {
        return m.length > 0 && m[m.length - 1].length > 0;
    }

    function mountainIsOne(m) {
        return m.length === 1 && m[0].length === 0;
    }

    function entryDisplay(entry) {
        const v = entry[0];
        const sep = entry[1];

        if (sep.every(column => !column.length)) {
            return ','.repeat(sep.length) + v;
        }

        return mountainDisplay(sep) + v;
    }

    function mountainDisplay(m) {
        return m.map(column => {
            return '(' + column.map(entryDisplay).join('') + ')';
        }).join('');
    }

    function columnDisplay(column) {
        return '(' + column.map(entryDisplay).join('') + ')';
    }

    function mountainToTokens(mountain) {
        const tokens = [];

        for (let c = 0; c < mountain.length; c++) {
            const column = mountain[c];

            if (!column || column.length === 0) {
                tokens.push({
                    type: 'mtwmn-token',
                    empty: true,
                    col: c,
                    row: 0,
                    colHeight: 1
                });
                continue;
            }

            const colHeight = column.length;

            for (let r = 0; r < column.length; r++) {
                tokens.push({
                    type: 'mtwmn-token',
                    empty: false,
                    entry: column[r],
                    v: column[r][0],
                    sep: column[r][1],
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return tokens;
    }

    function tokensToMountain(tokens) {
        if (!tokens || tokens.length === 0) return [];

        let maxCol = -1;

        tokens.forEach(t => {
            maxCol = Math.max(maxCol, t.col);
        });

        const mountain = Array.from({ length: maxCol + 1 }, () => []);

        tokens.forEach(t => {
            if (t.empty) {
                mountain[t.col] = [];
            } else {
                mountain[t.col][t.row] = t.entry;
            }
        });

        return mountain.map(col => col.filter(x => x !== undefined));
    }

    function tokensToString(tokens) {
        if (!tokens || tokens.length === 0) return '';

        let maxCol = -1;

        tokens.forEach(t => {
            maxCol = Math.max(maxCol, t.col);
        });

        const byCol = Array.from({ length: maxCol + 1 }, () => []);

        tokens.forEach(t => {
            byCol[t.col][t.row] = t;
        });

        return byCol.map(col => {
            const visible = col.filter(t => t !== undefined);

            if (visible.length === 0) return '()';

            if (visible.length === 1 && visible[0].empty) {
                return '()';
            }

            return '(' + visible
                .filter(t => !t.empty)
                .map(t => entryDisplay(t.entry))
                .join('') + ')';
        }).join('');
    }

    function verticalCompare(a, b) {
        let i = 0;

        while (true) {
            if (i >= a.length) {
                if (i >= b.length) return 0;
                return -1;
            }

            if (i >= b.length) return 1;

            const c = separatorCompare(a[i], b[i]);
            if (c) return c;

            i++;
        }
    }

    function verticalIncrease(v, m) {
        let i = v.length - 1;

        while (i >= 0 && separatorCompare(v[i], m) < 0) {
            i--;
        }

        return v.slice(0, i + 1).concat([m]);
    }

    function findIndexBelowRow(verticals, y) {
        const working = [[]].concat(verticals);

        let i1 = 0;
        let i2 = working.length - 1;

        while (i1 < i2) {
            const i = Math.ceil((i1 + i2) / 2);

            if (verticalCompare(working[i], y) < 0) {
                i1 = i;
            } else {
                i2 = i - 1;
            }
        }

        return i1;
    }

    function Parent(A, verticalss, pos) {
        const i = pos[0];
        const j = pos[1];

        const targetColumn = A[i][j][0] - 1;
        const targetI = findIndexBelowRow(verticalss[targetColumn], verticalss[i][j]);

        return [targetColumn, targetI];
    }

    function columnVerticals(column) {
        const v = [[]];

        for (let j = 0; j < column.length; j++) {
            v.push(verticalIncrease(v[j], column[j][1]));
        }

        return v.slice(1);
    }

    function getReferences(A, rtops) {
        const verticals = columnVerticals(A[A.length - 1]);
        verticals.unshift([]);

        const ref = [];
        let i = 0;
        let j = 0;

        while (i < verticals.length && j < rtops.length) {
            if (verticalCompare(verticals[i], rtops[j]) < 0) {
                ref[j] = i;
                i++;
            } else {
                j++;
            }
        }

        return ref;
    }

    function subtract1(A0, V, BRij) {
        const rightmost = A0.length - 1;
        const topmost = A0[rightmost].length - 1;

        if (!V) V = A0.map(columnVerticals);

        const A = deepClone(A0);
        let topRightSeparator = A[rightmost][topmost][1];

        if (!BRij) {
            if (mountainIsOne(topRightSeparator)) {
                BRij = Parent(A, V, [rightmost, topmost]);
            } else {
                let working = [rightmost, topmost];

                do {
                    working = Parent(A, V, working);
                    working[1]--;
                } while (
                    separatorCompare(
                        A[working[0]][working[1]]?.[1] ?? [],
                        topRightSeparator
                    ) >= 0
                );

                BRij = [working[0], working[1] + 1];
            }
        }

        const steped = Parent(A, V, [rightmost, topmost]);

        if (mountainIsOne(topRightSeparator)) {
            A[rightmost].pop();
        } else {
            topRightSeparator = topRightSeparator.slice(0, -1);

            if (
                verticalCompare(
                    verticalIncrease(
                        V[steped[0]][steped[1] - 1] ?? [],
                        topRightSeparator
                    ),
                    V[rightmost][topmost - 1] ?? []
                ) <= 0
            ) {
                A[rightmost].pop();
            } else {
                A[rightmost][topmost][1] = topRightSeparator;
            }
        }

        A[rightmost] = A[rightmost].concat(A[BRij[0]].slice(BRij[1]));

        return A;
    }

    function extend(A0) {
        const rightmost = A0.length - 1;
        const topmost = A0[rightmost].length - 1;
        const topRightSeparator = A0[rightmost][topmost][1];
        const V0 = A0.map(columnVerticals);

        let BRij;

        if (mountainIsOne(topRightSeparator)) {
            BRij = Parent(A0, V0, [rightmost, topmost]);
        } else {
            let working = [rightmost, topmost];

            do {
                working = Parent(A0, V0, working);
                working[1]--;
            } while (
                separatorCompare(
                    A0[working[0]][working[1]]?.[1] ?? [],
                    topRightSeparator
                ) >= 0
            );

            BRij = [working[0], working[1] + 1];
        }

        const topVerticals = V0[BRij[0]].slice(0, BRij[1]);
        topVerticals.push(V0[rightmost][topmost]);

        const width = rightmost - BRij[0];

        const magmaCheckss = [];

        for (let i = BRij[0] + 1; i <= rightmost; i++) {
            magmaCheckss[i] = [];

            for (let j = 0; j < A0[i].length; j++) {
                let working = [i, j];

                while (working[0] > BRij[0]) {
                    if (A0[working[0]].length <= working[1]) {
                        working[1]--;
                    }

                    working = Parent(A0, V0, working);
                }

                magmaCheckss[i][j] = (
                    working[0] === BRij[0] &&
                    working[1] <= BRij[1] &&
                    !verticalCompare(
                        V0[working[0]][working[1] - 1] ?? [],
                        V0[i][j - 1] ?? []
                    )
                ) ? working[1] : -1;
            }
        }

        const A = subtract1(A0, V0, BRij);

        const refs = getReferences(A, topVerticals);
        refs[-1] = -1;

        for (let dx = 1; dx <= width; dx++) {
            const x = BRij[0] + dx;
            const sourceMagmas = magmaCheckss[x];
            const targetColumn = A[x + width] = [];

            A0[x].forEach((entry, y) => {
                const value = entry[0];

                if (~sourceMagmas[y]) {
                    const BRindex = sourceMagmas[y];

                    for (let j = refs[BRindex - 1] + 1; j <= refs[BRindex]; j++) {
                        if (j === refs[BRindex]) {
                            targetColumn.push([value + width, entry[1]]);
                        } else {
                            targetColumn.push([
                                value + width,
                                A[BRij[0] + width][j][1]
                            ]);
                        }
                    }
                } else {
                    targetColumn.push([
                        value + (value > BRij[0] ? width : 0),
                        entry[1]
                    ]);
                }
            });
        }

        return A;
    }

    function threshold(A, shorter, low, high) {
        let n = 0;

        while (true) {
            const res = expandMTWMN(A, n, shorter);

            if (
                verticalCompare(
                    verticalIncrease(low, res),
                    verticalIncrease(high, res)
                ) >= 0
            ) {
                return n;
            }

            n++;
        }
    }

    function expandMTWMN(A0, FSterm, shorter = false) {
        const rightmost = A0.length - 1;
        const topmost = A0[rightmost].length - 1;
        const topRightSeparator = A0[rightmost][topmost][1];

        let A = A0;

        if (mountainIsLimit(topRightSeparator)) {
            A = A.map(column => column.slice());
            A[rightmost][topmost] = A[rightmost][topmost].slice();

            const V = A.map(columnVerticals);
            const steped = Parent(A, V, [rightmost, topmost]);

            A[rightmost][topmost][1] = expandMTWMN(
                topRightSeparator,
                threshold(
                    topRightSeparator,
                    shorter,
                    V[steped[0]][steped[1] - 1] ?? [],
                    V[rightmost][topmost - 1] ?? []
                ) + FSterm,
                shorter
            );

            return A;
        }

        for (let n = 1; n <= FSterm; n++) {
            A = extend(A);
        }

        return shorter ? A.slice(0, -1) : subtract1(A);
    }

    function Limit(n) {
        return n > 0
            ? [[], [[1, Limit(n - 1)]]]
            : [[]];
    }

    function makeLimitItem(n) {
        return {
            type: 'mtwmn-limit-item',
            n,
            expr: Limit(n)
        };
    }

    function formatLimitItem(item) {
        return mountainDisplay(item.expr);
    }

    function parseMTWMN(input) {
        let s = String(input).trim();

        s = s
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        s = s.replace(/\s+/g, '');

        if (!s) {
            throw new Error('请输入 MTωMN 表达式，例如：()(,,1)(,,2,,2)');
        }

        let i = 0;

        function parseNumber() {
            const start = i;

            while (i < s.length && /\d/.test(s[i])) {
                i++;
            }

            if (start === i) {
                throw new Error('缺少数字');
            }

            return parseInt(s.slice(start, i), 10);
        }

        function parseMountainForSeparator() {
            const cols = [];

            while (s[i] === '(') {
                cols.push(parseColumn());
            }

            if (cols.length === 0) {
                throw new Error('缺少分隔山');
            }

            return cols;
        }

        function parseEntry() {
            let sep;

            if (s[i] === ',') {
                let count = 0;

                while (s[i] === ',') {
                    count++;
                    i++;
                }

                sep = Array.from({ length: count }, () => []);
            } else if (s[i] === '(') {
                sep = parseMountainForSeparator();
            } else {
                sep = [];
            }

            const value = parseNumber();

            return [value, sep];
        }

        function parseColumn() {
            if (s[i] !== '(') {
                throw new Error('缺少左括号');
            }

            i++;

            const column = [];

            while (i < s.length && s[i] !== ')') {
                column.push(parseEntry());
            }

            if (s[i] !== ')') {
                throw new Error('缺少右括号');
            }

            i++;

            return column;
        }

        const mountain = [];

        while (i < s.length) {
            if (s[i] !== '(') {
                throw new Error('MTωMN 表达式只能由括号列组成');
            }

            mountain.push(parseColumn());
        }

        return mountain;
    }

    function getBadRootColumn(A) {
        if (!A || A.length === 0) return -1;

        const lastCol = A[A.length - 1];
        if (!lastCol || lastCol.length === 0) return -1;

        const lastEntry = lastCol[lastCol.length - 1];
        if (!lastEntry) return -1;

        return lastEntry[0] - 1;
    }

    function expandMountainRecord(A, times) {
        if (!A || A.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        // 后继序数：末列为空列 ()，展开即删除末列
        if (!mountainIsLimit(A)) {
            const resultMountain = A.slice(0, -1);
            const resultTokens = mountainToTokens(resultMountain);

            return {
                result: resultTokens,
                goodLength: resultTokens.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const badCol = getBadRootColumn(A);

        const finalMountain = expandMTWMN(A, times, true);
        const finalTokens = mountainToTokens(finalMountain);

        const goodMountain = A.slice(0, -1);
        const goodTokens = mountainToTokens(goodMountain);
        const goodLength = goodTokens.length;

        const groups = [];
        let prevLen = goodLength;

        for (let k = 1; k <= times; k++) {
            const kthMountain = expandMTWMN(A, k, true);
            const kthTokens = mountainToTokens(kthMountain);

            groups.push(kthTokens.slice(prevLen));
            prevLen = kthTokens.length;
        }

        const badRootIndex = badCol >= 0
            ? finalTokens.findIndex(t => t.col === badCol)
            : -1;

        return {
            result: finalTokens,
            goodLength,
            groups,
            badRootIndex,
            badRootColIndex: badCol
        };
    }

    registerNotation({
        id: 'MTωMN',
        name: 'MTωMN',
        placeholder: '例如：()(,,1)(,,2,,2)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return mountainToTokens(parseMTWMN(input));
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isLimitSeq(seq)) {
                return 'sup{' + seq.map(formatLimitItem).join(',') + ',...}';
            }

            if (isMTWMNTokenSeq(seq)) {
                return tokensToString(seq);
            }

            return mountainDisplay(seq);
        },

        formatToken(token) {
            if (isLimitItem(token)) {
                return formatLimitItem(token);
            }

            if (token && token.type === 'mtwmn-token') {
                if (token.empty) {
                    return '()';
                }

                const text = entryDisplay(token.entry);
                const isFirst = token.row === 0;
                const isLast = token.row === token.colHeight - 1;

                if (isFirst && isLast) {
                    return '(' + text + ')';
                }

                if (isFirst) {
                    return '(' + text;
                }

                if (isLast) {
                    return text + ')';
                }

                return text;
            }

            return columnDisplay(token);
        },

        separator(curr, next) {
            if (isLimitItem(curr) || isLimitItem(next)) {
                return ',';
            }

            return '';
        },

        getTokenGroupKey(token, index) {
            if (isLimitItem(token)) return index;

            if (token && token.type === 'mtwmn-token') {
                return token.col;
            }

            return index;
        },

        compareSeq(a, b) {
            const ma = isMTWMNTokenSeq(a) ? tokensToMountain(a) : a;
            const mb = isMTWMNTokenSeq(b) ? tokensToMountain(b) : b;

            return mountainCompare(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                if (!seq || seq.length === 0) return -1;

                const tokens = isMTWMNTokenSeq(seq)
                    ? seq
                    : mountainToTokens(seq);

                const mountain = isMTWMNTokenSeq(seq)
                    ? tokensToMountain(seq)
                    : seq;

                if (!mountainIsLimit(mountain)) return -1;

                const badCol = getBadRootColumn(mountain);
                if (badCol < 0) return -1;

                return tokens.findIndex(t => t.col === badCol);
            } catch {
                return -1;
            }
        },

        isBadRootToken(record, index) {
            if (!record || !record.result) return false;

            const cur = record.result[index];
            if (!cur || cur.type !== 'mtwmn-token') return false;

            if (
                record.badRootColIndex !== undefined &&
                record.badRootColIndex !== null &&
                record.badRootColIndex >= 0
            ) {
                return cur.col === record.badRootColIndex;
            }

            if (record.badRootIndex === undefined || record.badRootIndex < 0) {
                return false;
            }

            const bad = record.result[record.badRootIndex];
            if (!bad || bad.type !== 'mtwmn-token') return false;

            return cur.col === bad.col;
        },

        getHoverTargetIndices(seq, badIndex) {
            if (!seq || badIndex < 0) return [];

            const bad = seq[badIndex];

            if (!bad || bad.col === undefined) {
                return [badIndex];
            }

            const indices = [];

            for (let i = 0; i < seq.length; i++) {
                const t = seq[i];

                if (t && t.col === bad.col) {
                    indices.push(i);
                }
            }

            return indices;
        },

        isSuccessor(seq) {
            if (!seq || seq.length === 0) return true;

            const mountain = isMTWMNTokenSeq(seq)
                ? tokensToMountain(seq)
                : seq;

            return !mountainIsLimit(mountain);
        },

        countStep(seq) {
            const expanded = this.expand(clone(seq), 1);

            if (!expanded || !expanded.result) return seq;

            const result = expanded.result;
            const goodLength = expanded.goodLength ?? 0;

            if (goodLength >= result.length) return result;

            const firstNew = result[goodLength];

            if (!firstNew || firstNew.col === undefined) {
                return result;
            }

            const targetCol = firstNew.col;

            let end = goodLength;

            while (
                end < result.length &&
                result[end] &&
                result[end].col === targetCol
            ) {
                end++;
            }

            return result.slice(0, end);
        },

        expand(seq, times) {
            const mountain = isMTWMNTokenSeq(seq)
                ? tokensToMountain(seq)
                : seq;

            return expandMountainRecord(mountain, times);
        },

        limit: {
            initial() {
                return [
                    makeLimitItem(1),
                    makeLimitItem(2)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    makeLimitItem(seq.length + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isLimitItem(item)) return [];

                return mountainToTokens(item.expr);
            }
        }
    });
})();