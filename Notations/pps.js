registerNotation({
    id: 'pps',
    name: 'PPS',
    placeholder: '例如：0,1,0,1',
    defaultTimes: 3,
    lexDesc: true,

    parse(input) {
        input = input.trim();
        if (!/^-?\d+(,-?\d+)*$/.test(input)) {
            throw new Error('PPS 只能输入逗号分隔的整数');
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

    getBadRootIndex(seq) {
        if (!seq.length) return -1;
        const last = seq[seq.length - 1];
        if (last >= 1 && last <= seq.length) return last - 1;
        return -1;
    },

    expand(seq, times) {
        const n = seq.length;
        const last = seq[n - 1];
        const good = seq.slice(0, -1);
        const groups = [];

        const badRootIndex = this.getBadRootIndex(seq);

        if (last === 0) {
            return {
                result: good,
                goodLength: good.length,
                groups,
                badRootIndex
            };
        }

        const parentIndex = last;
        let badRootValue = null;
        let badPart = [];
        let diff = 0;
        let whiteRootExists = false;

        if (parentIndex >= 1 && parentIndex <= n) {
            badRootValue = seq[parentIndex - 1];
            badPart = seq.slice(parentIndex, n - 1);
            diff = n - parentIndex;
            whiteRootExists = badPart.some(v => v === badRootValue);
        } else {
            diff = n - parentIndex;
        }

        let result = good.slice();

        for (let i = 1; i <= times; i++) {
            const group = [];

            if (whiteRootExists) {
                group.push(badRootValue);
            } else {
                group.push(last - 1);
            }

            const processed = badPart.map(v => {
                if (v < last) return v;
                return v + diff * i;
            });

            group.push(...processed);
            result.push(...group);
            groups.push(group);
        }

        return {
            result,
            goodLength: good.length,
            groups,
            badRootIndex
        };
    },

    limit: {
        initial() {
            return [0, 1, 2, 3];
        },

        extend(seq) {
            const next = seq.length;
            return [...seq, next];
        },

        select(seq, index) {
            return seq.slice(0, index + 1);
        }
    }
});