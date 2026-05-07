registerNotation({
    id: 'omegads',
    name: 'RPrSS',
    placeholder: '例如：0,1,2',
    defaultTimes: 3,
    lexDesc: true,

    parse(input) {
        input = input.trim();

        if (!input) {
            throw new Error('ωdS 输入不能为空');
        }

        if (!/^\d+(,\d+)*$/.test(input)) {
            throw new Error('ωdS 只能输入逗号分隔的自然数');
        }

        return input.split(',').map(Number);
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

    parentIndex(A, idx) {
        if (idx <= 0) return -1;

        const targetVal = A[idx];

        for (let y = idx - 1; y >= 0; y--) {
            if (A[y] < targetVal) {
                return y;
            }
        }

        return -1;
    },

    findBadRoot(A) {
        const n = A.length;

        if (n === 0) return null;

        const lastIdx = n - 1;

        let cur = this.parentIndex(A, lastIdx);

        if (cur === -1) return null;

        while (cur !== -1) {
            const f_au = this.parentIndex(A, cur);

            if (cur === 0) {
                return {
                    index: cur,
                    value: A[cur]
                };
            }

            const a_u_minus_1 = A[cur - 1];
            const f_au_value = f_au === -1 ? undefined : A[f_au];

            if (f_au_value !== a_u_minus_1) {
                return {
                    index: cur,
                    value: A[cur]
                };
            }

            cur = this.parentIndex(A, cur);
        }

        return null;
    },

    getBadRootIndex(seq) {
        if (!seq || seq.length === 0) return -1;

        if (seq[seq.length - 1] === 0) return -1;

        const info = this.findBadRoot(seq);

        if (!info) return -1;

        return info.index;
    },

    isSuccessor(seq) {
        if (!seq || seq.length === 0) return true;

        return seq[seq.length - 1] === 0;
    },

    expand(seq, times) {
        const n = seq.length;

        if (n === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const lastValue = seq[n - 1];

        if (lastValue === 0) {
            const result = seq.slice(0, n - 1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        if (times <= 0) {
            const result = seq.slice(0, n - 1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const badRootInfo = this.findBadRoot(seq);

        if (!badRootInfo) {
            throw new Error('无法找到坏根（真父项不存在）。请检查序列是否符合 ωdS 规则。');
        }

        const badIdx = badRootInfo.index;
        const badValue = badRootInfo.value;

        const B = seq.slice(badIdx, n - 1);

        const delta = lastValue - badValue - 1;

        const base = seq.slice(0, n - 1);
        const result = base.slice();
        const groups = [];

        for (let k = 1; k <= times; k++) {
            const group = B.map(v => v + delta * k);
            result.push(...group);
            groups.push(group);
        }

        return {
            result,
            goodLength: base.length,
            groups,
            badRootIndex: badIdx
        };
    },

    limit: {
        initial() {
            return [0, 1, 2, 3];
        },

        extend(seq) {
            return [...seq, seq.length];
        },

        select(seq, index) {
            return seq.slice(0, index + 1);
        }
    }
});