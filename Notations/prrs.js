/* ============================================================
   PRRS
============================================================ */

registerNotation({
    id: 'prrs',
    name: 'PRRS',
    placeholder: '例如：0,1,1',
    defaultTimes: 3,
    lexDesc: true,

    parse(input) {
        input = input.trim();

        if (!input) {
            throw new Error('PRRS 请输入逗号分隔的整数序列');
        }

        const parts = input
            .split(/[,，\s]+/)
            .filter(x => x.length > 0);

        if (parts.length === 0 || parts.some(x => !/^-?\d+$/.test(x))) {
            throw new Error('PRRS 只能输入逗号或空白分隔的整数');
        }

        return parts.map(Number);
    },

    format(seq) {
        return seq.join(',');
    },

    formatToken(token) {
        return String(token);
    },

    compareSeq(a, b) {
        const n = Math.min(a.length, b.length);

        for (let i = 0; i < n; i++) {
            if (a[i] !== b[i]) return a[i] - b[i];
        }

        return a.length - b.length;
    },

    getBadRootIndex(seq) {
        if (!seq || seq.length === 0) return -1;

        const x = seq[seq.length - 1];

        if (x >= 1 && x <= seq.length) {
            return x - 1;
        }

        return -1;
    },

    expand(seq, times) {
        const s = clone(seq);
        const y = s.length;

        if (y === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const x = s[y - 1];
        const badRootIndex = this.getBadRootIndex(s);

        // x <= 0：直接删除末项
        if (x <= 0) {
            const good = s.slice(0, -1);

            return {
                result: good,
                goodLength: good.length,
                groups: [],
                badRootIndex
            };
        }

        if (x > y) {
            throw new Error('PRRS 展开失败：末项指向的位置超出序列长度');
        }

        const b = s[x - 1];
        const L = y - x;
        const a = s.lastIndexOf(0) + 1;

        const leftZero = y > 1 && s[y - 2] === 0;

        const xVal = s[x - 1];
        const xPrevVal = x > 1 ? s[x - 2] : null;

        const isSub1 = (x === 1) || (xVal === 0 && xPrevVal === 0);

        const res = [...s.slice(0, -1)];
        const groups = [];

        const offset = (!leftZero && !isSub1) ? L + 1 : L;

        if (offset <= 0) {
            return {
                result: res,
                goodLength: res.length,
                groups: [],
                badRootIndex
            };
        }

        for (let block = 0; block < times; block++) {
            const group = [];

            for (let t = 0; t < offset; t++) {
                const j = y + block * offset + t;
                const i = j - offset;
                const vi = res[i - 1];

                let nextVal;

                if (vi === 0) {
                    nextVal = 0;
                } else if (leftZero) {
                    nextVal = vi >= x ? vi + L : vi;
                } else if (isSub1) {
                    if (j < y + L) {
                        nextVal = vi <= x ? vi + (a + 1 - x) : vi + L;
                    } else {
                        nextVal = vi + L;
                    }
                } else {
                    if (j < y + L) {
                        nextVal = vi < x ? vi + (a + 1 - b) : vi + offset;
                    } else {
                        nextVal = vi + offset;
                    }
                }

                res.push(nextVal);
                group.push(nextVal);
            }

            groups.push(group);
        }

        return {
            result: res,
            goodLength: y - 1,
            groups,
            badRootIndex
        };
    },

    limit: {
        initial() {
            return [0, 1, 1, 1];
        },

        extend(seq) {
            return [...seq, 1];
        },
        
        select(seq, index) {
            return seq.slice(0, index + 1);
        }
    }
});