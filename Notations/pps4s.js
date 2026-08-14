/* ============================================================
   PPS4s
============================================================ */

(function() {
    function parsePPS4s(input) {
        const parts = String(input)
            .trim()
            .replaceAll('，', ',')
            .split(/[\s,]+/)
            .filter(Boolean);

        if (parts.length === 0) {
            throw new Error('请输入有效序列，例如：0,1,1');
        }

        const seq = parts.map(Number);

        if (seq.some(n => !Number.isInteger(n) || n < 0)) {
            throw new Error('序列只能包含非负整数');
        }

        return seq;
    }

    function getPPS4sBadRootIndex(seq) {
        if (!seq || seq.length === 0) return -1;

        const Y = seq.length;
        const X = seq[Y - 1];

        // 末项 0 是后继序数，没有坏根。
        if (X === 0) return -1;

        if (X > Y) {
            throw new Error(`末项值 ${X} 作为列标超出序列长度 ${Y}`);
        }

        // 原算法中的 B = seq[X - 1]，所以坏根下标是 X - 1。
        return X - 1;
    }

    function expandPPS4sRaw(seq, nCount) {
        if (seq.length === 0) return [];

        const Y = seq.length;
        const X = seq[Y - 1];

        // 后继序数：直接删除末项。
        if (X === 0) {
            return seq.slice(0, -1);
        }

        if (X > Y) {
            throw new Error(`末项值 ${X} 作为列标超出序列长度 ${Y}`);
        }

        const B = seq[X - 1];
        const L = Y - X;

        let v;
        let strongExpand = false;
        let foundLessOrEqual = false;

        for (let col = Y - 1; col >= X + 1; col--) {
            if (seq[col - 1] <= B) {
                foundLessOrEqual = true;
                break;
            }
        }

        if (foundLessOrEqual) {
            v = B;
        } else {
            let foundCol = null;
            const strongStart = B + 1;
            const strongEnd = X - 1;

            if (strongStart <= strongEnd) {
                for (let col = strongEnd; col >= strongStart; col--) {
                    if (seq[col - 1] === B) {
                        foundCol = col;
                        break;
                    }
                }
            }

            if (foundCol !== null) {
                v = foundCol;
                strongExpand = true;
            } else {
                v = B;
            }
        }

        const totalLen = Y + nCount * L - 1;
        const result = new Array(totalLen);

        for (let i = 0; i < X; i++) {
            result[i] = seq[i];
        }

        for (let i = X; i < Y - 1; i++) {
            result[i] = seq[i];
        }

        result[Y - 1] = v;

        for (let i = X; i < Y; i++) {
            const baseVal = i === Y - 1 ? v : seq[i];
            const shouldRise = baseVal >= X;
            const maxK = i === Y - 1 ? nCount - 1 : nCount;

            for (let k = 1; k <= maxK; k++) {
                const pos = i + k * L;

                if (pos >= totalLen) continue;

                if ((i === Y - 1 && strongExpand) || shouldRise) {
                    result[pos] = baseVal + k * L;
                } else {
                    result[pos] = baseVal;
                }
            }
        }

        return result;
    }

    function expandPPS4s(seq, times) {
        if (!seq || seq.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const Y = seq.length;
        const X = seq[Y - 1];

        // 与原操作序列一致：展开参数 0 表示删除末项。
        if (times === 0 || X === 0) {
            const result = seq.slice(0, -1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        if (X > Y) {
            throw new Error(`末项值 ${X} 作为列标超出序列长度 ${Y}`);
        }

        const result = expandPPS4sRaw(seq, times);
        const blockLength = Y - X;
        const groups = [];

        /*
         * 原算法的结果结构是：
         *
         *   seq[0..X-1] + 展开块
         *
         * X - 1 是坏根，X 开始是展开部分。按长度 L 分组，
         * 最后一组可能比 L 少一项，这是原算法 totalLen 的结果。
         */
        for (let start = X; start < result.length; start += blockLength) {
            groups.push(result.slice(start, start + blockLength));
        }

        return {
            result,
            goodLength: X,
            groups,
            badRootIndex: X - 1
        };
    }

    function makePPS4sLimitToken(value) {
        return {
            type: 'pps4s-limit-token',
            value
        };
    }

    function isPPS4sLimitToken(token) {
        return token &&
            typeof token === 'object' &&
            token.type === 'pps4s-limit-token';
    }

    function isPPS4sLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isPPS4sLimitToken(seq[0]);
    }

    registerNotation({
        id: 'PPS4s',
        name: 'PPS4s',
        placeholder: '例如：0,1,1',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return parsePPS4s(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isPPS4sLimitSeq(seq)) {
                return 'sup{' +
                    seq.map(token => token.value).join(',') +
                    ',...}';
            }

            return seq.join(',');
        },

        formatToken(token) {
            if (isPPS4sLimitToken(token)) {
                return String(token.value);
            }

            return String(token);
        },

        separator() {
            return ',';
        },

        compareSeq(a, b) {
            const minLength = Math.min(a.length, b.length);

            for (let i = 0; i < minLength; i++) {
                if (a[i] < b[i]) return -1;
                if (a[i] > b[i]) return 1;
            }

            if (a.length < b.length) return -1;
            if (a.length > b.length) return 1;
            return 0;
        },

        getBadRootIndex(seq) {
            try {
                return getPPS4sBadRootIndex(seq);
            } catch {
                return -1;
            }
        },

        isSuccessor(seq) {
            return !seq ||
                seq.length === 0 ||
                seq[seq.length - 1] === 0;
        },

        /*
         * 计数序列的一步：
         *
         * 展开一次后，原末项对应的新项位于原来的末项位置
         * seq.length - 1。只保留原前缀和这个对应项。
         */
        countStep(seq) {
            if (!seq || seq.length === 0) return [];

            if (seq[seq.length - 1] === 0) {
                return seq.slice(0, -1);
            }

            const expanded = expandPPS4s(seq, 1);
            const correspondingIndex = seq.length - 1;
            const corresponding = expanded.result[correspondingIndex];

            if (corresponding === undefined) {
                throw new Error('PPS4s 无法找到末项对应的展开项');
            }

            return [
                ...seq.slice(0, -1),
                corresponding
            ];
        },

        expand(seq, times) {
            return expandPPS4s(seq, times);
        },

        /*
         * 极限表达式：
         *
         *   sup{0,1,2,3,4,...}
         *
         * 这是直接截取式：
         * 点击 3 返回 0,1,2,3。
         */
        limit: {
            initial() {
                return [
                    makePPS4sLimitToken(0),
                    makePPS4sLimitToken(1),
                    makePPS4sLimitToken(2),
                    makePPS4sLimitToken(3)
                ];
            },

            extend(seq) {
                const lastValue = seq.length > 0
                    ? seq[seq.length - 1].value
                    : -1;

                return [
                    ...seq,
                    makePPS4sLimitToken(lastValue + 1)
                ];
            },

            select(seq, index) {
                return seq
                    .slice(0, index + 1)
                    .map(token => token.value);
            }
        }
    });
})();