/* ============================================================
   HPrSS
============================================================ */

(function() {
    function parseHPrSS(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('，', ',')
            .replaceAll('｛', '{')
            .replaceAll('｝', '}');

        t = t.replace(/[{}]/g, '');
        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的 HPrSS 序列，例如：1,3,4,6');
        }

        const parts = t.split(',');

        if (parts.some(p => !/^-?\d+$/.test(p))) {
            throw new Error('序列中包含无效数字');
        }

        return parts.map(Number);
    }

    function formatHPrSS(seq) {
        return seq.join(',');
    }

    function findParent(arr, idx) {
        for (let i = idx - 1; i >= 0; i--) {
            if (arr[i] < arr[idx]) return i;
        }

        return -1;
    }

    function analyzeHPrSS(arr) {
        const L = arr.length - 1;

        if (L < 0) {
            return {
                isSuccessor: true,
                result: [],
                good: [],
                bad: [],
                badRoot: -1,
                C: 0
            };
        }

        const lastVal = arr[L];

        const chain = [L];
        let curr = L;

        while (true) {
            const p = findParent(arr, curr);

            if (p !== -1) {
                chain.unshift(p);
                curr = p;
            } else {
                break;
            }
        }

        if (chain.length === 1) {
            return {
                isSuccessor: true,
                result: arr.slice(0, -1),
                good: arr.slice(0, -1),
                bad: [],
                badRoot: -1,
                C: 0,
                chain
            };
        }

        const diffs = [];

        for (let i = 0; i < chain.length - 1; i++) {
            diffs.push(arr[chain[i + 1]] - arr[chain[i]]);
        }

        let badIdx;

        if (lastVal - arr[chain[chain.length - 2]] === 1) {
            badIdx = chain.length - 2;
        } else {
            const lastDiff = diffs[diffs.length - 1];

            let foundK = -1;

            for (let k = diffs.length - 2; k >= 0; k--) {
                if (diffs[k] < lastDiff) {
                    foundK = k;
                    break;
                }
            }

            const note = foundK !== -1 ? foundK + 2 : 1;
            badIdx = note - 1;
        }

        const badRoot = chain[badIdx];
        const C = lastVal - arr[badRoot] - 1;

        const good = arr.slice(0, badRoot);
        const bad = arr.slice(badRoot, L);

        return {
            isSuccessor: false,
            good,
            bad,
            badRoot,
            C,
            chain,
            diffs
        };
    }

    function expandHPrSS(seq, times) {
        const arr = [...seq];
    
        if (arr.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }
    
        const info = analyzeHPrSS(arr);
    
        if (info.isSuccessor) {
            return {
                result: info.result,
                goodLength: info.result.length,
                groups: [],
                badRootIndex: -1
            };
        }
    
        const res = [];
    
        res.push(...info.good);
    
        res.push(...info.bad);
    
        const originalBadLength = info.bad.length;
        const goodLength = info.good.length + originalBadLength;
    
        const groups = [];
    
        for (let i = 1; i <= times; i++) {
            const group = info.bad.map(x => x + i * info.C);
            res.push(...group);
            groups.push(group);
        }
    
        return {
            result: res,
            goodLength,
            groups,
            badRootIndex: info.good.length,
            badRootSourceIndex: info.badRoot
        };
    }

    function makeHPrSSLimitItem(n) {
        return {
            type: 'hprss-limit-item',
            n,
            expr: [1, n]
        };
    }

    function isHPrSSLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'hprss-limit-item';
    }

    function isHPrSSLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isHPrSSLimitItem(seq[0]);
    }

    function formatHPrSSLimitItem(item) {
        return '{1,' + item.n + '}';
    }

    registerNotation({
        id: 'HPrSS',
        name: 'HPrSS',
        placeholder: '例如：1,3,5',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return parseHPrSS(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isHPrSSLimitSeq(seq)) {
                return 'sup{' + seq.map(formatHPrSSLimitItem).join(',') + ',...}';
            }

            return formatHPrSS(seq);
        },

        formatToken(token) {
            if (isHPrSSLimitItem(token)) {
                return formatHPrSSLimitItem(token);
            }

            return String(token);
        },

        separator() {
            return ',';
        },

        compareSeq(a, b) {
            const min = Math.min(a.length, b.length);

            for (let i = 0; i < min; i++) {
                if (a[i] < b[i]) return -1;
                if (a[i] > b[i]) return 1;
            }

            if (a.length < b.length) return -1;
            if (a.length > b.length) return 1;
            return 0;
        },

        getBadRootIndex(seq) {
            try {
                const info = analyzeHPrSS(seq);

                if (info.isSuccessor) return -1;

                return info.badRoot;
            } catch {
                return -1;
            }
        },

        isSuccessor(seq) {
            try {
                return analyzeHPrSS(seq).isSuccessor;
            } catch {
                return true;
            }
        },

        expand(seq, times) {
            return expandHPrSS(seq, times);
        },

        limit: {
            initial() {
                return [
                    makeHPrSSLimitItem(2),
                    makeHPrSSLimitItem(3),
                    makeHPrSSLimitItem(4),
                    makeHPrSSLimitItem(5)
                ];
            },

            extend(seq) {
                const last = seq.length > 0
                    ? seq[seq.length - 1].n
                    : 1;

                return [
                    ...seq,
                    makeHPrSSLimitItem(last + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isHPrSSLimitItem(item)) return [];

                return [...item.expr];
            }
        }
    });
})();