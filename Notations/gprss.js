registerNotation({
    id: 'gprss',
    name: 'GPrSS(BO ver.)',
    placeholder: '例如：0,1,2,3,4',
    defaultTimes: 3,
    lexDesc: true,

    parse(input) {
        input = input.trim();

        if (!input) {
            throw new Error('GPrSS 输入不能为空');
        }

        if (!/^-?\d+(,-?\d+)*$/.test(input)) {
            throw new Error('GPrSS 只能输入逗号分隔的整数');
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

    getSegments(arr) {
        const segments = [];
        const startIndices = [];

        if (arr.length === 0) {
            return { segments, startIndices };
        }

        let currentSegment = [arr[0]];
        startIndices.push(0);

        for (let i = 1; i < arr.length; i++) {
            if (arr[i] > arr[i - 1]) {
                currentSegment.push(arr[i]);
            } else {
                segments.push(currentSegment);
                currentSegment = [arr[i]];
                startIndices.push(i);
            }
        }

        segments.push(currentSegment);

        return { segments, startIndices };
    },

    normalizeSegment(segment) {
        const firstVal = segment[0];
        return segment.map(v => v - firstVal);
    },

    compareArrays(a, b) {
        const len = Math.min(a.length, b.length);

        for (let i = 0; i < len; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }

        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;

        return 0;
    },

    getBadRootIndex(seq) {
        if (!seq || seq.length === 0) return -1;

        const firstItem = seq[0];
        const lastItem = seq[seq.length - 1];

        if (lastItem <= firstItem) return -1;

        const segmentsData = this.getSegments(seq);
        const segments = segmentsData.segments;
        const startIndices = segmentsData.startIndices;

        if (segments.length === 0) return -1;

        const lastSegment = segments[segments.length - 1];

        let badRootIndex = 0;

        if (lastSegment.length === 1) {
            // 若末段长度为 1，直接找到最右侧的根作为坏根
            const roots = [];

            for (let i = 0; i < segments.length; i++) {
                if (segments[i][0] < lastItem) {
                    roots.push(startIndices[i]);
                }
            }

            if (roots.length > 0) {
                badRootIndex = roots[roots.length - 1];
            } else {
                badRootIndex = 0;
            }

            return badRootIndex;
        }

        // 否则：取末段作为判定段
        let currentSegIndex = segments.length - 1;
        let currentSeg = lastSegment;
        let foundBadRoot = false;

        const normLastSegment = this.normalizeSegment(lastSegment);

        for (let i = segments.length - 2; i >= 0; i--) {
            const candidateSeg = segments[i];

            const valCurrent = currentSeg[0];
            const valCandidate = candidateSeg[0];

            // 若候选段首项大于判定段首项，跳过
            if (valCandidate > valCurrent) {
                continue;
            }

            const normCandidate = this.normalizeSegment(candidateSeg);
            const isLessThanLast =
                this.compareArrays(normCandidate, normLastSegment) < 0;

            if (valCandidate === valCurrent) {
                if (isLessThanLast) {
                    badRootIndex = startIndices[currentSegIndex];
                    foundBadRoot = true;
                    break;
                }
            } else {
                if (isLessThanLast) {
                    badRootIndex = startIndices[currentSegIndex];
                    foundBadRoot = true;
                    break;
                } else {
                    currentSegIndex = i;
                    currentSeg = candidateSeg;
                }
            }
        }

        if (!foundBadRoot) {
            badRootIndex = startIndices[currentSegIndex];
        }

        return badRootIndex;
    },

    isSuccessor(seq) {
        if (!seq || seq.length === 0) return true;
        return seq[seq.length - 1] <= seq[0];
    },

    countStep(seq) {
        if (!seq || seq.length === 0) return seq;
    
        if (this.isSuccessor(seq)) {
            return seq;
        }
    
        const expanded = this.expand(seq.slice(), 1);
    
        if (
            !expanded ||
            !expanded.groups ||
            expanded.groups.length === 0
        ) {
            return expanded && expanded.result ? expanded.result : seq;
        }
    
        const nextToken =
            expanded.groups[1] && expanded.groups[1].length > 0
                ? expanded.groups[1][0]
                : expanded.groups[0] && expanded.groups[0].length > 0
                    ? expanded.groups[0][0]
                    : null;
    
        if (nextToken === null || nextToken === undefined) {
            return expanded.result || seq;
        }
    
        return seq.slice(0, -1).concat([nextToken]);
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

        const firstItem = seq[0];
        const lastItem = seq[seq.length - 1];

        if (lastItem <= firstItem) {
            const result = seq.slice(0, -1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const segmentsData = this.getSegments(seq);
        const segments = segmentsData.segments;

        if (segments.length === 0) {
            return {
                result: seq.slice(),
                goodLength: seq.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const lastSegment = segments[segments.length - 1];

        const badRootIndex = this.getBadRootIndex(seq);

        if (badRootIndex < 0 || badRootIndex >= seq.length) {
            return {
                result: seq.slice(),
                goodLength: seq.length,
                groups: [],
                badRootIndex: -1
            };
        }

        // G = [首项, 坏根)
        const G = seq.slice(0, badRootIndex);

        // B0 = [坏根, 末项)
        const B0 = seq.slice(badRootIndex, seq.length - 1);

        const badRootValue = seq[badRootIndex];

        // d = 末项值 - 坏根值 - 1，或 lastSegment[0] - badRootValue + 1
        const d = lastSegment.length < 3
            ? lastItem - badRootValue - 1
            : lastSegment[0] - badRootValue + 1;

        let result = G.slice();
        const groups = [];

        for (let n = 0; n <= times; n++) {
            const Bn = B0.map(v => v + n * d);
            result = result.concat(Bn);
            groups.push(Bn);
        }

        return {
            result,
            goodLength: G.length,
            groups,
            badRootIndex: B0.length > 0 ? G.length : -1
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