registerNotation({
    id: 'ups',
    name: '*UPS(opt ver.)',
    placeholder: '例如：0,1*,2*,1*',
    defaultTimes: 3,
    lexDesc: true,

    parse(input) {
        input = input.trim();
        if (!/^(\d+\*?,)*\d+\*?$/.test(input)) {
            throw new Error('UPS 表达式格式错误，例如：0,1*,2*,1*');
        }

        return input.split(',').map(item => {
            if (item.includes('*')) {
                return [Number(item.replace('*', '')), 1];
            }
            return [Number(item), 0];
        });
    },

    format(seq) {
        return seq.map(item => item[1] ? item[0] + '*' : String(item[0])).join(',');
    },

    formatToken(token) {
        return token[1] ? token[0] + '*' : String(token[0]);
    },

    compareSeq(a, b) {
        const n = Math.min(a.length, b.length);

        for (let i = 0; i < n; i++) {
            if (a[i][0] !== b[i][0]) return a[i][0] - b[i][0];
            if (a[i][1] !== b[i][1]) return a[i][1] - b[i][1];
        }

        return a.length - b.length;
    },

    getBadRootIndex(seq) {
        try {
            return this.computeBadRoot(seq);
        } catch {
            return -1;
        }
    },

    computeBadRoot(inputSeq) {
        const s = clone(inputSeq);

        const last = (s, n = 1, i = s.length - 1) => {
            while (i >= 0 && s[i][0] != n) i--;
            return i;
        };

        const cut = (s, t, e = s.length) => {
            if (t == -1) return [];
            let r = [];
            let d = s[t][0];
            let m = s.length > e ? e + 1 : s.length;

            for (let i = t; i < m && s[i][0] >= d; i++) {
                r.push([s[i][0] - d, i == e ? 1 : s[i][1]]);
            }

            return r;
        };

        const compare = (a, b, i = 0) =>
            a.length == i
                ? b.length == i ? 0 : -1
                : b.length == i
                    ? 1
                    : a[i][0] > b[i][0]
                        ? 1
                        : a[i][0] < b[i][0]
                            ? -1
                            : a[i][1] == b[i][1]
                                ? compare(a, b, i + 1)
                                : a[i][1] - b[i][1];

        const next = s => cut(s, last(s));

        const next0 = s => {
            s = next(s);
            return compare(s, [[0, 1]]) < 0 ? s : next0(s);
        };

        const sup = (s, f1, f2) => {
            let i = f1;
            while (s[i][1] || s[i][0] != s[f2][0]) i++;
            return i;
        };

        const father = (s, n = s.length - 1) => last(s, s[n][0] - 1, n - 1);

        const fa0 = (s, n = s.length - 1) => {
            n = father(s, n);
            return s[n >= 0 ? n : 0][1] ? fa0(s, n) : n;
        };

        function proj(s, n) {
            let ne = next0(s);

            for (let i = 0; i < n; i++) {
                if (compare(s = next(s), [[0, 1]]) < 0) {
                    s = 0;
                    break;
                }
            }

            if (ne.length) ne = proj(ne, n);

            return s == 0 || ne.length && compare(s, ne) > 0 ? ne : s;
        }

        function unproj(s1, s2) {
            for (let i = 0; ; i++) {
                let p1 = proj(s1, i);
                let p2 = proj(s2, i);

                if (p1.length == 0) return true;
                if (compare(p1, p2) > 0) return false;
            }
        }

        let b;

        if (s[s.length - 1][1] == 0) {
            if (s[s.length - 1][0] == 0) return -1;
            b = father(s);
        } else {
            for (let f2 = fa0(s), f1 = fa0(s, f2); ; f2 = f1, f1 = fa0(s, f1)) {
                if (f1 == -1) {
                    b = 0;
                    break;
                }

                b = sup(s, f1, f2);

                if (unproj(cut(s, f1, b), cut(s, f2))) break;
            }
        }

        return b;
    },

    expand(inputSeq, z) {
        const s0 = clone(inputSeq);
        const goodLength = s0.length - 1;

        const last = (s, n = 1, i = s.length - 1) => {
            while (i >= 0 && s[i][0] != n) i--;
            return i;
        };

        const cut = (s, t, e = s.length) => {
            if (t == -1) return [];
            let r = [];
            let d = s[t][0];
            let m = s.length > e ? e + 1 : s.length;

            for (let i = t; i < m && s[i][0] >= d; i++) {
                r.push([s[i][0] - d, i == e ? 1 : s[i][1]]);
            }

            return r;
        };

        const compare = (a, b, i = 0) =>
            a.length == i
                ? b.length == i ? 0 : -1
                : b.length == i
                    ? 1
                    : a[i][0] > b[i][0]
                        ? 1
                        : a[i][0] < b[i][0]
                            ? -1
                            : a[i][1] == b[i][1]
                                ? compare(a, b, i + 1)
                                : a[i][1] - b[i][1];

        const next = s => cut(s, last(s));

        const next0 = s => {
            s = next(s);
            return compare(s, [[0, 1]]) < 0 ? s : next0(s);
        };

        const sup = (s, f1, f2) => {
            let i = f1;
            while (s[i][1] || s[i][0] != s[f2][0]) i++;
            return i;
        };

        const father = (s, n = s.length - 1) => last(s, s[n][0] - 1, n - 1);

        const fa0 = (s, n = s.length - 1) => {
            n = father(s, n);
            return s[n >= 0 ? n : 0][1] ? fa0(s, n) : n;
        };

        function proj(s, n) {
            let ne = next0(s);

            for (let i = 0; i < n; i++) {
                if (compare(s = next(s), [[0, 1]]) < 0) {
                    s = 0;
                    break;
                }
            }

            if (ne.length) ne = proj(ne, n);

            return s == 0 || ne.length && compare(s, ne) > 0 ? ne : s;
        }

        function unproj(s1, s2) {
            for (let i = 0; ; i++) {
                let p1 = proj(s1, i);
                let p2 = proj(s2, i);

                if (p1.length == 0) return true;
                if (compare(p1, p2) > 0) return false;
            }
        }

        let s = clone(inputSeq);
        let b;

        if (s[s.length - 1][1] == 0) {
            if (s[s.length - 1][0] == 0) {
                throw new Error('后继序数，无法展开');
            }
            b = father(s);
        } else {
            for (let f2 = fa0(s), f1 = fa0(s, f2); ; f2 = f1, f1 = fa0(s, f1)) {
                if (f1 == -1) {
                    b = 0;
                    break;
                }

                b = sup(s, f1, f2);

                if (unproj(cut(s, f1, b), cut(s, f2))) break;
            }
        }

        const d = s[s.length - 1][0] + s[s.length - 1][1] - s[b][0] - 1;

        s.pop();

        let B = s.slice(b);
        const groups = [];

        for (let i = 0; i < z; i++) {
            B = B.map(item => [item[0] + d, item[1]]);
            s.push(...B);
            groups.push(clone(B));
        }

        return {
            result: s,
            goodLength,
            groups,
            badRootIndex: b
        };
    },

    isSuccessor(seq) {
        if (!seq || seq.length === 0) return true;
    
        const last = seq[seq.length - 1];
    
        return last[0] === 0 && last[1] === 0;
    },

    limit: {
        initial() {
            return [[0, 0], [1, 1], [2, 1], [3, 1]];
        },

        extend(seq) {
            const next = seq.length;
            return [...seq, [next, 1]];
        },

        select(seq, index) {
            return seq.slice(0, index + 1);
        }
    }
});