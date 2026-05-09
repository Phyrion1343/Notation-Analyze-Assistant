registerNotation({
    id: 'pps4',
    name: 'PPS4',
    placeholder: '例如：0,1,0,3',
    defaultTimes: 4,
    lexDesc: true,

    parse(input) {
        input = String(input)
            .trim()
            .replaceAll('，', ',');

        if (!input) {
            throw new Error('PPS4 输入不能为空');
        }

        if (!/^-?\d+(,-?\d+)*$/.test(input)) {
            throw new Error('PPS4 只能输入逗号分隔的整数');
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
        if (!seq || seq.length === 0) return -1;

        const y = seq.length;
        const x = seq[y - 1];

        if (x === 0) return -1;

        if (!Number.isInteger(x)) return -1;
        if (x < 1 || x >= y) return -1;

        return x - 1;
    },

    isSuccessor(seq) {
        if (!seq || seq.length === 0) return true;
        return seq[seq.length - 1] === 0;
    },

    expand(seq, times) {
        if (!seq || seq.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const y = seq.length;       
        const x = seq[y - 1];       

        if (x === 0) {
            const result = seq.slice(0, -1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        if (!Number.isInteger(x)) {
            throw new Error('PPS4 末项必须是整数列标');
        }

        if (x < 1 || x >= y) {
            throw new Error(`PPS4 非法末项：末项 ${x} 必须满足 1 ≤ x < ${y}`);
        }

        const n = Math.max(0, Math.floor(Number(times) || 0));

        const A = [-1, ...seq];

        const b = A[x];     // 坏根的值
        const L = y - x;    // 步长

        if (!Number.isFinite(b)) {
            throw new Error('PPS4 无法读取坏根的值');
        }

        if (n <= 0) {
            const result = seq.slice(0, -1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: x - 1
            };
        }

        let hasWeak = false;

        for (let i = x + 1; i < y; i++) {
            if (A[i] === b) {
                hasWeak = true;
                break;
            }
        }

        if (hasWeak) {
            A[y] = b;
        } else {
            let foundK = -1;

            for (let i = x - 1; i > b; i--) {
                if (A[i] <= b) {
                    foundK = i;
                    break;
                }
            }

            if (foundK !== -1) {
                A[y] = foundK;
            } else {
                A[y] = b;
            }
        }

        const targetLength = y + n * L - 1;

        for (let i = x + 1; i <= targetLength - L; i++) {
            const currentVal = A[i];

            if (!Number.isFinite(currentVal)) {
                throw new Error(`PPS4 展开过程中 A[${i}] 未定义`);
            }

            if (currentVal >= x) {
                A[i + L] = currentVal + L;
            } else {
                A[i + L] = currentVal;
            }
        }

        const result = A.slice(1, targetLength + 1);

        const goodLength = y - 1;
        const groups = [];

        for (let k = 1; k <= n; k++) {
            const start = goodLength + (k - 1) * L;
            const end = goodLength + k * L;
            groups.push(result.slice(start, end));
        }

        return {
            result,
            goodLength,
            groups,
            badRootIndex: x - 1
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