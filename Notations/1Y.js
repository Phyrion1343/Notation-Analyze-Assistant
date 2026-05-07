/* ============================================================
   1-Y
============================================================ */

(function() {
    const itemSeparatorRegex = /[\t ,]+/g;

    function parseSequenceElement(s, i) {
        s = String(s).trim();

        if (s.indexOf('v') === -1 || !isFinite(Number(s.substring(s.indexOf('v') + 1)))) {
            const numval = Number(s);

            if (!Number.isFinite(numval)) {
                throw new Error('序列中包含无效数字');
            }

            return {
                value: numval,
                position: i,
                parentIndex: -1
            };
        } else {
            const vIndex = s.indexOf('v');
            const value = Number(s.substring(0, vIndex));
            const parent = Number(s.substring(vIndex + 1));

            if (!Number.isFinite(value) || !Number.isFinite(parent)) {
                throw new Error('序列中包含无效 forced parent 项');
            }

            return {
                value,
                position: i,
                parentIndex: Math.max(Math.min(i - 1, parent), -1),
                forcedParent: true
            };
        }
    }

    function parseY(input) {
        const t = String(input)
            .trim()
            .replaceAll('，', ',');

        if (!t) {
            throw new Error('请输入有效的 1-Y 序列，例如：1,2,4,8,10,8');
        }

        const parts = t.split(itemSeparatorRegex).filter(x => x !== '');

        if (parts.length === 0) {
            throw new Error('请输入有效的 1-Y 序列，例如：1,2,4,8,10,8');
        }

        return parts.map(parseSequenceElement);
    }

    function formatYToken(token) {
        if (isYLimitItem(token)) {
            return '{' + formatYLimitItem(token) + '}';
        }

        if (token && token.forcedParent) {
            return String(token.value) + 'v' + token.parentIndex;
        }

        return String(token.value);
    }

    function formatY(seq) {
        if (!seq || seq.length === 0) return '';

        if (isYLimitSeq(seq)) {
            return 'sup{' + seq.map(token => '{' + formatYLimitItem(token) + '}').join(',') + ',...}';
        }

        return seq.map(formatYToken).join(',');
    }

    function seqToString(seq) {
        if (!seq || seq.length === 0) return '';
        return seq.map(formatYToken).join(',');
    }

    function cloneMountain(mountain) {
        const newMountain = [];

        for (let i = 0; i < mountain.length; i++) {
            const layer = [];

            for (let j = 0; j < mountain[i].length; j++) {
                layer.push({
                    value: mountain[i][j].value,
                    position: mountain[i][j].position,
                    parentIndex: mountain[i][j].parentIndex,
                    forcedParent: mountain[i][j].forcedParent
                });
            }

            newMountain.push(layer);
        }

        return newMountain;
    }

    function calcMountain(s) {
        let lastLayer;

        if (typeof s === 'string') {
            lastLayer = s
                .split(itemSeparatorRegex)
                .filter(x => x !== '')
                .map(parseSequenceElement);
        } else {
            lastLayer = s.map((x, i) => ({
                value: x.value,
                position: x.position ?? i,
                parentIndex: x.parentIndex ?? -1,
                forcedParent: x.forcedParent
            }));
        }

        const calculatedMountain = [lastLayer];

        while (true) {
            let hasNextLayer = false;

            for (let i = 0; i < lastLayer.length; i++) {
                if (lastLayer[i].forcedParent) {
                    if (lastLayer[i].parentIndex !== -1) {
                        hasNextLayer = true;
                    }
                    continue;
                }

                let p;

                if (calculatedMountain.length === 1) {
                    p = lastLayer[i].position + 1;
                } else {
                    p = 0;

                    while (
                        calculatedMountain[calculatedMountain.length - 2][p] &&
                        calculatedMountain[calculatedMountain.length - 2][p].position < lastLayer[i].position + 1
                    ) {
                        p++;
                    }
                }

                while (true) {
                    if (p < 0) break;

                    let j;

                    if (calculatedMountain.length === 1) {
                        p--;
                        j = p - 1;
                    } else {
                        p = calculatedMountain[calculatedMountain.length - 2][p].parentIndex;
                        if (p < 0) break;

                        j = 0;

                        while (
                            lastLayer[j] &&
                            lastLayer[j].position < calculatedMountain[calculatedMountain.length - 2][p].position - 1
                        ) {
                            j++;
                        }
                    }

                    if (
                        j < 0 ||
                        (
                            j < lastLayer.length - 1 &&
                            lastLayer[j].position + 1 !== lastLayer[j + 1].position
                        )
                    ) {
                        break;
                    }

                    if (lastLayer[j].value < lastLayer[i].value) {
                        lastLayer[i].parentIndex = j;
                        hasNextLayer = true;
                        break;
                    }
                }
            }

            if (!hasNextLayer) break;

            const currentLayer = [];
            calculatedMountain.push(currentLayer);

            for (let i = 0; i < lastLayer.length; i++) {
                if (lastLayer[i].parentIndex !== -1) {
                    currentLayer.push({
                        value: lastLayer[i].value - lastLayer[lastLayer[i].parentIndex].value,
                        position: lastLayer[i].position - 1,
                        parentIndex: -1
                    });
                }
            }

            lastLayer = currentLayer;
        }

        return calculatedMountain;
    }

    function calcDiagonal(mountain) {
        const diagonal = [];
        const diagonalTree = [];

        for (let i = 0; i < mountain[0].length; i++) {
            for (let j = mountain.length - 1; j >= 0; j--) {
                let k = 0;

                while (mountain[j][k] && mountain[j][k].position + j < i) {
                    k++;
                }

                if (!mountain[j][k] || mountain[j][k].position + j !== i) {
                    continue;
                }

                let height = j;
                let lastIndex = k;

                while (true) {
                    if (height === 0) {
                        lastIndex = mountain[height][lastIndex].parentIndex;
                    } else {
                        let l = 0;

                        while (
                            mountain[height - 1][l] &&
                            mountain[height - 1][l].position !== mountain[height][lastIndex].position + 1
                        ) {
                            l++;
                        }

                        l = mountain[height - 1][l].parentIndex;

                        let m = 0;

                        while (
                            mountain[height][m] &&
                            mountain[height][m].position < mountain[height - 1][l].position - 1
                        ) {
                            m++;
                        }

                        if (
                            mountain[height][m] &&
                            mountain[height][m].position === mountain[height - 1][l].position - 1
                        ) {
                            lastIndex = m;
                        } else {
                            height--;
                            lastIndex = l;
                        }
                    }

                    if (
                        !mountain[height][lastIndex] ||
                        mountain[height][lastIndex].parentIndex === -1
                    ) {
                        diagonal.push(mountain[j][k].value);
                        diagonalTree.push(
                            (mountain[height][lastIndex] ? mountain[height][lastIndex].position : -1) + height
                        );
                        break;
                    }
                }

                break;
            }
        }

        const pw = [];

        for (let i = 0; i < diagonal.length; i++) {
            let p = -1;

            for (let j = i - 1; j >= 0; j--) {
                if (diagonal[j] < diagonal[i]) {
                    p = j;
                    break;
                }
            }

            pw.push(p);
        }

        const r = [];

        for (let i = 0; i < diagonal.length; i++) {
            let p = i;

            while (true) {
                p = diagonalTree[p];

                if (p < 0 || diagonal[p] < diagonal[i]) {
                    break;
                }
            }

            if (p === pw[i]) {
                r.push(String(diagonal[i]));
            } else {
                r.push(diagonal[i] + 'v' + p);
            }
        }

        return r.join(',');
    }

    function getBadRoot(s) {
        let mountain;

        if (typeof s === 'string') {
            mountain = calcMountain(s);
        } else {
            mountain = cloneMountain(s);
        }

        const diagonal = calcMountain(calcDiagonal(mountain));

        if (diagonal[0][diagonal[0].length - 1].value !== 1) {
            return getBadRoot(diagonal);
        } else {
            for (let i = mountain.length - 1; i >= 0; i--) {
                if (
                    mountain[i][mountain[i].length - 1].position + i ===
                    mountain[0].length - 1
                ) {
                    const parentIndex = mountain[i - 1][mountain[i - 1].length - 1].parentIndex;
                    return mountain[i - 1][parentIndex].position + i - 1;
                }
            }
        }

        return -1;
    }

    function mountainTopToString(result) {
        const rr = [];

        for (let i = 0; result[0] && i < result[0].length; i++) {
            const item = result[0][i];

            if (item.forcedParent) {
                rr.push(item.value + 'v' + item.parentIndex);
            } else {
                rr.push(String(item.value));
            }
        }

        return rr.join(',');
    }

    // 基本按原 HTML expand 原样搬运
    function expandOriginal(s, n, stringify) {
        let mountain;

        if (typeof s === 'string') {
            mountain = calcMountain(s);
        } else {
            mountain = cloneMountain(s);
        }

        let result = cloneMountain(mountain);

        if (mountain[0][mountain[0].length - 1].parentIndex === -1) {
            result[0].pop();
        } else {
            result = cloneMountain(mountain);

            let cutHeight = mountain.length - 1;

            while (
                mountain[cutHeight][mountain[cutHeight].length - 1].position + cutHeight !==
                mountain[0].length - 1
            ) {
                cutHeight--;
            }

            const actualCutHeight = cutHeight;
            const badRootSeam = getBadRoot(mountain);
            let badRootHeight;

            const diagonal = calcMountain(calcDiagonal(mountain));
            let newDiagonal;

            const yamakazi = diagonal[0][diagonal[0].length - 1].value === 1;

            if (yamakazi) {
                newDiagonal = cloneMountain(diagonal);
                newDiagonal[0].pop();

                for (let i = 0; i < n; i++) {
                    for (let j = badRootSeam; j < mountain[0].length - 1; j++) {
                        // 保持原逻辑：直接 push 对象引用
                        newDiagonal[0].push(newDiagonal[0][j]);
                    }
                }

                cutHeight--;
                badRootHeight = cutHeight;
            } else {
                newDiagonal = expandOriginal(diagonal, n, false);

                badRootHeight = mountain.length - 1;

                while (true) {
                    let i = 0;

                    while (
                        mountain[badRootHeight][i] &&
                        mountain[badRootHeight][i].position + badRootHeight < badRootSeam
                    ) {
                        i++;
                    }

                    if (
                        mountain[badRootHeight][i] &&
                        mountain[badRootHeight][i].position + badRootHeight === badRootSeam
                    ) {
                        break;
                    }

                    badRootHeight--;
                }
            }

            for (let i = 0; i <= actualCutHeight; i++) {
                result[i].pop();
            }

            if (!result[result.length - 1].length) {
                result.pop();
            }

            const afterCutHeight = result.length;
            const afterCutLength = result[0].length;

            let badRootSeamHeight = afterCutHeight - 1;

            while (true) {
                let l = 0;

                while (
                    mountain[badRootSeamHeight][l] &&
                    mountain[badRootSeamHeight][l].position + badRootSeamHeight < badRootSeam
                ) {
                    l++;
                }

                if (
                    mountain[badRootSeamHeight][l] &&
                    mountain[badRootSeamHeight][l].position + badRootSeamHeight === badRootSeam
                ) {
                    break;
                }

                badRootSeamHeight--;
            }

            badRootSeamHeight++;

            for (let i = 1; i <= n; i++) {
                for (let j = badRootSeam; j < afterCutLength; j++) {
                    let isAscending;
                    let p = 0;

                    while (
                        mountain[badRootHeight][p] &&
                        mountain[badRootHeight][p].position + badRootHeight < j
                    ) {
                        p++;
                    }

                    if (
                        mountain[badRootHeight][p] &&
                        mountain[badRootHeight][p].position + badRootHeight === j
                    ) {
                        while (true) {
                            if (
                                !mountain[badRootHeight][p] ||
                                mountain[badRootHeight][p].position + badRootHeight < badRootSeam
                            ) {
                                isAscending = false;
                                break;
                            }

                            if (
                                mountain[badRootHeight][p].position + badRootHeight ===
                                badRootSeam
                            ) {
                                isAscending = true;
                                break;
                            }

                            p = mountain[badRootHeight][p].parentIndex;
                        }
                    } else {
                        isAscending = false;
                    }

                    let seamHeight = afterCutHeight - 1;

                    while (true) {
                        let l = 0;

                        while (
                            mountain[seamHeight][l] &&
                            mountain[seamHeight][l].position + seamHeight < j
                        ) {
                            l++;
                        }

                        if (
                            mountain[seamHeight][l] &&
                            mountain[seamHeight][l].position + seamHeight === j
                        ) {
                            break;
                        }

                        seamHeight--;
                    }

                    seamHeight++;

                    const isReplacingCut = j === badRootSeam;

                    if (isAscending) {
                        for (let k = 0; k < seamHeight + (cutHeight - badRootHeight) * i; k++) {
                            if (!result[k]) result.push([]);

                            if (k < badRootHeight) {
                                const sy = k;
                                let sx;

                                if (isReplacingCut) {
                                    sx = mountain[sy].length - 1;
                                } else {
                                    sx = 0;
                                    while (
                                        mountain[sy][sx].position + sy < j
                                    ) {
                                        sx++;
                                    }
                                }

                                const sourceParentIndex = mountain[sy][sx].parentIndex;
                                const parentShifts = i - isReplacingCut;

                                const parentPosition = mountain[sy][sourceParentIndex]
                                    ? mountain[sy][sourceParentIndex].position +
                                      parentShifts *
                                      (afterCutLength - badRootSeam) *
                                      (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) -
                                      (k - sy)
                                    : -1;

                                let parentIndex = 0;

                                while (
                                    result[k][parentIndex] &&
                                    result[k][parentIndex].position < parentPosition
                                ) {
                                    parentIndex++;
                                }

                                if (
                                    !result[k][parentIndex] ||
                                    result[k][parentIndex].position !== parentPosition
                                ) {
                                    parentIndex = -1;
                                }

                                result[k].push({
                                    value: parentIndex === -1
                                        ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value
                                        : NaN,
                                    position: j + (afterCutLength - badRootSeam) * i - k,
                                    parentIndex,
                                    forcedParent: mountain[sy][sx].forcedParent
                                });
                            } else if (
                                k <= badRootHeight + (cutHeight - badRootHeight) * (i - isReplacingCut)
                            ) {
                                const sy = badRootHeight;
                                let sx;

                                if (!yamakazi && isReplacingCut) {
                                    sx = mountain[sy].length - 1;
                                } else {
                                    sx = 0;
                                    while (
                                        mountain[sy][sx].position + sy < j
                                    ) {
                                        sx++;
                                    }
                                }

                                const sourceParentIndex = mountain[sy][sx].parentIndex;
                                const parentShifts = i - isReplacingCut;

                                const parentPosition = mountain[sy][sourceParentIndex]
                                    ? mountain[sy][sourceParentIndex].position +
                                      parentShifts *
                                      (afterCutLength - badRootSeam) *
                                      (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) -
                                      (k - sy)
                                    : -1;

                                let parentIndex = 0;

                                while (
                                    result[k][parentIndex] &&
                                    result[k][parentIndex].position < parentPosition
                                ) {
                                    parentIndex++;
                                }

                                if (
                                    !result[k][parentIndex] ||
                                    result[k][parentIndex].position !== parentPosition
                                ) {
                                    parentIndex = -1;
                                }

                                result[k].push({
                                    value: parentIndex === -1
                                        ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value
                                        : NaN,
                                    position: j + (afterCutLength - badRootSeam) * i - k,
                                    parentIndex,
                                    forcedParent: mountain[sy][sx].forcedParent
                                });
                            } else if (
                                isReplacingCut &&
                                k <= badRootHeight + (cutHeight - badRootHeight) * i
                            ) {
                                const sy = k - (cutHeight - badRootHeight) * (i - 1);
                                let sx;

                                if (!yamakazi && isReplacingCut) {
                                    sx = mountain[sy].length - 1;
                                } else {
                                    sx = 0;
                                    while (
                                        mountain[sy][sx].position + sy < j
                                    ) {
                                        sx++;
                                    }
                                }

                                const sourceParentIndex = mountain[sy][sx].parentIndex;
                                const parentShifts = i - isReplacingCut;

                                const parentPosition = mountain[sy][sourceParentIndex]
                                    ? mountain[sy][sourceParentIndex].position +
                                      parentShifts *
                                      (afterCutLength - badRootSeam) *
                                      (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) -
                                      (k - sy)
                                    : -1;

                                let parentIndex = 0;

                                while (
                                    result[k][parentIndex] &&
                                    result[k][parentIndex].position < parentPosition
                                ) {
                                    parentIndex++;
                                }

                                if (
                                    !result[k][parentIndex] ||
                                    result[k][parentIndex].position !== parentPosition
                                ) {
                                    parentIndex = -1;
                                }

                                result[k].push({
                                    value: parentIndex === -1
                                        ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value
                                        : NaN,
                                    position: j + (afterCutLength - badRootSeam) * i - k,
                                    parentIndex,
                                    forcedParent: mountain[sy][sx].forcedParent
                                });
                            } else {
                                const sy = k - (cutHeight - badRootHeight) * i;
                                let sx;

                                if (!yamakazi && isReplacingCut) {
                                    sx = mountain[sy].length - 1;
                                } else {
                                    sx = 0;
                                    while (
                                        mountain[sy][sx].position + sy < j
                                    ) {
                                        sx++;
                                    }
                                }

                                const sourceParentIndex = mountain[sy][sx].parentIndex;
                                const parentShifts = i - isReplacingCut;

                                const parentPosition = mountain[sy][sourceParentIndex]
                                    ? mountain[sy][sourceParentIndex].position +
                                      parentShifts *
                                      (afterCutLength - badRootSeam) *
                                      (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) -
                                      (k - sy)
                                    : -1;

                                let parentIndex = 0;

                                while (
                                    result[k][parentIndex] &&
                                    result[k][parentIndex].position < parentPosition
                                ) {
                                    parentIndex++;
                                }

                                if (
                                    !result[k][parentIndex] ||
                                    result[k][parentIndex].position !== parentPosition
                                ) {
                                    parentIndex = -1;
                                }

                                result[k].push({
                                    value: parentIndex === -1
                                        ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value
                                        : NaN,
                                    position: j + (afterCutLength - badRootSeam) * i - k,
                                    parentIndex,
                                    forcedParent: mountain[sy][sx].forcedParent
                                });
                            }
                        }
                    } else {
                        for (let k = 0; k < seamHeight; k++) {
                            if (!result[k]) result.push([]);

                            const sy = k;
                            let sx;

                            if (isReplacingCut) {
                                sx = mountain[sy].length - 1;
                            } else {
                                sx = 0;
                                while (
                                    mountain[sy][sx].position + sy < j
                                ) {
                                    sx++;
                                }
                            }

                            const sourceParentIndex = mountain[sy][sx].parentIndex;
                            const parentShifts = i - isReplacingCut;

                            const parentPosition = mountain[sy][sourceParentIndex]
                                ? mountain[sy][sourceParentIndex].position +
                                  parentShifts *
                                  (afterCutLength - badRootSeam) *
                                  (mountain[sy][sourceParentIndex].position + sy >= badRootSeam) -
                                  (k - sy)
                                : -1;

                            let parentIndex = 0;

                            while (
                                result[k][parentIndex] &&
                                result[k][parentIndex].position < parentPosition
                            ) {
                                parentIndex++;
                            }

                            if (
                                !result[k][parentIndex] ||
                                result[k][parentIndex].position !== parentPosition
                            ) {
                                parentIndex = -1;
                            }

                            result[k].push({
                                value: parentIndex === -1
                                    ? newDiagonal[0][j + (afterCutLength - badRootSeam) * i].value
                                    : NaN,
                                position: j + (afterCutLength - badRootSeam) * i - k,
                                parentIndex,
                                forcedParent: mountain[sy][sx].forcedParent
                            });
                        }
                    }
                }
            }
        }

        for (let i = result.length - 1; i >= 0; i--) {
            if (!result[i].length) {
                result.pop();
                continue;
            }

            for (let j = 0; j < result[i].length; j++) {
                if (!isNaN(result[i][j].value)) continue;

                let k = 0;

                while (
                    result[i + 1][k].position < result[i][j].position - 1
                ) {
                    k++;
                }

                if (result[i + 1][k].position !== result[i][j].position - 1) {
                    throw new Error('Mountain not complete');
                }

                result[i][j].value =
                    result[i][result[i][j].parentIndex].value +
                    result[i + 1][k].value;
            }
        }

        if (stringify) {
            return mountainTopToString(result);
        }

        return result;
    }

    function expandToSeq(seq, n) {
        const s = seqToString(seq);
        const expandedString = expandOriginal(s, n, true);
        return parseY(expandedString);
    }

    function getGoodLength(seq) {
        try {
            return expandToSeq(seq, 0).length;
        } catch {
            return Math.max(seq.length - 1, 0);
        }
    }

    function expandY(seq, times) {
        if (!seq || seq.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const inputString = seqToString(seq);
        const mountain = calcMountain(inputString);
        const lastTop = mountain[0][mountain[0].length - 1];

        if (!lastTop || lastTop.parentIndex === -1) {
            const result = expandToSeq(seq, 1);

            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const result = expandToSeq(seq, times);
        const goodLength = getGoodLength(seq);

        const groups = [];
        let prevLen = goodLength;

        for (let k = 1; k <= times; k++) {
            const kth = expandToSeq(seq, k);
            groups.push(kth.slice(prevLen));
            prevLen = kth.length;
        }

        let badRootIndex = -1;

        try {
            badRootIndex = getBadRoot(inputString);
        } catch {
            badRootIndex = -1;
        }

        return {
            result,
            goodLength,
            groups,
            badRootIndex
        };
    }

    function compareYSeq(a, b) {
        const min = Math.min(a.length, b.length);

        for (let i = 0; i < min; i++) {
            const av = a[i].value;
            const bv = b[i].value;

            if (av < bv) return -1;
            if (av > bv) return 1;
        }

        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;

        return 0;
    }

    function makeYLimitItem(n) {
        return {
            type: 'y1-limit-item',
            n,
            expr: parseY('1,' + n)
        };
    }

    function isYLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'y1-limit-item';
    }

    function isYLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isYLimitItem(seq[0]);
    }

    function formatYLimitItem(item) {
        return '1,' + item.n;
    }

    /* ========================================================
       1-Y 绘图区：山脉图 actions 版
       用于框架 drawDiagram(seq)
    ======================================================== */

    function seqToValuesForDiagram1Y(seq) {
        if (!Array.isArray(seq)) return [];

        return seq
            .filter(x => x && typeof x === 'object' && !isYLimitItem(x))
            .map(x => Number(x.value))
            .filter(x => Number.isFinite(x));
    }

    class YMountainDiagram1Y {
        constructor(initialSeq) {
            this.initialSeq = initialSeq.slice();
            this.baseParents = this.calcBaseParents(initialSeq);
            this.layers = [];
            this.build();
        }

        calcBaseParents(seq) {
            const p = new Array(seq.length).fill(-1);

            for (let i = 0; i < seq.length; i++) {
                for (let j = i - 1; j >= 0; j--) {
                    if (seq[j] < seq[i]) {
                        p[i] = j;
                        break;
                    }
                }
            }

            return p;
        }

        findParentInRow(c, val, rowNodes) {
            let curr = this.baseParents[c];

            while (curr !== -1) {
                if (rowNodes[curr] !== null && rowNodes[curr] !== undefined) {
                    if (rowNodes[curr] < val) {
                        return curr;
                    }
                }

                curr = this.baseParents[curr];
            }

            return -1;
        }

        build() {
            let currentExtracted = this.initialSeq.slice();
            const maxLayers = 25;

            for (let l = 0; l < maxLayers; l++) {
                const layerData = {
                    rows: [],
                    parents: []
                };

                layerData.rows.push(currentExtracted.slice());
                layerData.parents.push(new Array(currentExtracted.length).fill(-1));

                let r = 1;

                while (true) {
                    const prevRow = layerData.rows[r - 1];
                    const newRow = new Array(currentExtracted.length).fill(null);
                    const newParents = new Array(currentExtracted.length).fill(-1);

                    let hasNodes = false;

                    for (let c = 0; c < currentExtracted.length; c++) {
                        if (prevRow[c] !== null && prevRow[c] !== undefined) {
                            const val = prevRow[c];
                            const p = this.findParentInRow(c, val, prevRow);

                            if (p !== -1) {
                                newRow[c] = val - prevRow[p];
                                newParents[c] = p;
                                hasNodes = true;
                            }
                        }
                    }

                    if (!hasNodes) break;

                    layerData.rows.push(newRow);
                    layerData.parents.push(newParents);
                    r++;
                }

                this.layers.push(layerData);

                const nextExtracted = new Array(currentExtracted.length).fill(null);
                let allOnes = true;

                for (let c = 0; c < currentExtracted.length; c++) {
                    let maxR = -1;

                    for (let rowIdx = layerData.rows.length - 1; rowIdx >= 0; rowIdx--) {
                        if (layerData.rows[rowIdx][c] !== null && layerData.rows[rowIdx][c] !== undefined) {
                            maxR = rowIdx;
                            break;
                        }
                    }

                    if (maxR === -1) {
                        nextExtracted[c] = null;
                        continue;
                    }

                    const val = layerData.rows[maxR][c];
                    nextExtracted[c] = val;

                    if (val !== null && val !== 1) {
                        allOnes = false;
                    }
                }

                let isSame = true;

                for (let c = 0; c < currentExtracted.length; c++) {
                    if (nextExtracted[c] !== currentExtracted[c]) {
                        isSame = false;
                        break;
                    }
                }

                if (layerData.rows.length === 1 || isSame || allOnes) {
                    break;
                }

                currentExtracted = nextExtracted;
            }
        }
    }

    function makeOmegaLabel1Y(layerIndex, rowIndex) {
        if (layerIndex === 0) {
            return `R ${rowIndex}`;
        }

        const omega = layerIndex === 1
            ? 'ω'
            : `ω${layerIndex}`;

        const plus = rowIndex === 0
            ? ''
            : `+${rowIndex}`;

        return `R ${omega}${plus}`;
    }

    function drawMountainActions1YCompact(yMountain, offsetY = 0) {
        if (!yMountain || !yMountain.layers || yMountain.layers.length === 0) {
            return {
                width: 1,
                height: 1,
                actions: []
            };
        }

        const layers = yMountain.layers;
        const cols = yMountain.initialSeq.length;

        /*
           紧凑参数。
           如果觉得图太密，可以调大：
             cellWidth, rowHeight, layerGap
        */
        const cellWidth = 28;
        const rowHeight = 34;
        const leftPadding = 44;
        const rightPadding = 14;
        const verticalMargin = 12;
        const layerGap = 30;

        let totalHeight = verticalMargin * 2;

        for (let l = 0; l < layers.length; l++) {
            totalHeight += Math.max(0, layers[l].rows.length - 1) * rowHeight;

            if (l < layers.length - 1) {
                totalHeight += layerGap;
            }
        }

        const width = leftPadding + rightPadding + Math.max(0, cols - 1) * cellWidth;
        const height = totalHeight;

        const actions = [];

        let currentY = offsetY + totalHeight - verticalMargin;

        const nodeCoords = [];
        const layerDividersY = [];

        for (let l = 0; l < layers.length; l++) {
            const layerCoords = [];

            for (let r = 0; r < layers[l].rows.length; r++) {
                const rowCoords = [];

                for (let c = 0; c < cols; c++) {
                    if (layers[l].rows[r][c] !== null && layers[l].rows[r][c] !== undefined) {
                        rowCoords.push({
                            x: leftPadding + c * cellWidth,
                            y: currentY
                        });
                    } else {
                        rowCoords.push(null);
                    }
                }

                layerCoords.push(rowCoords);

                if (r < layers[l].rows.length - 1) {
                    currentY -= rowHeight;
                }
            }

            nodeCoords.push(layerCoords);

            if (l < layers.length - 1) {
                currentY -= layerGap / 2;
                layerDividersY.push(currentY);
                currentY -= layerGap / 2;
            }
        }

        /*
           先画层间分隔线。
           框架 canvas renderer 暂时不支持虚线，所以这里用蓝色实线。
        */
        for (let i = 0; i < layerDividersY.length; i++) {
            const divY = layerDividersY[i];

            actions.push({ type: 'strokeStyle', value: '#007BFF' });
            actions.push({ type: 'lineWidth', value: 1.0 });
            actions.push({
                type: 'line',
                start: {
                    x: 8,
                    y: divY
                },
                end: {
                    x: width - 8,
                    y: divY
                }
            });
        }

        /*
           画连线。
        */
        for (let l = 0; l < layers.length; l++) {
            for (let r = 0; r < layers[l].rows.length; r++) {
                for (let c = 0; c < cols; c++) {
                    const curr = nodeCoords[l][r][c];

                    if (!curr || r <= 0) continue;

                    const bottom = nodeCoords[l][r - 1][c];
                    const parentIdx = layers[l].parents[r][c];
                    const pNode = parentIdx !== -1
                        ? nodeCoords[l][r - 1][parentIdx]
                        : null;

                    const offset = 8;

                    actions.push({ type: 'strokeStyle', value: '#666' });
                    actions.push({ type: 'lineWidth', value: 1.15 });

                    if (bottom) {
                        actions.push({
                            type: 'line',
                            start: {
                                x: curr.x,
                                y: curr.y + offset
                            },
                            end: {
                                x: bottom.x,
                                y: bottom.y - offset
                            }
                        });
                    }

                    if (pNode) {
                        actions.push({
                            type: 'line',
                            start: {
                                x: curr.x,
                                y: curr.y + offset
                            },
                            end: {
                                x: pNode.x,
                                y: pNode.y - offset
                            }
                        });
                    }
                }
            }
        }

        /*
           画节点数字和左侧行标。
        */
        for (let l = 0; l < layers.length; l++) {
            for (let r = 0; r < layers[l].rows.length; r++) {
                let rowHasNodes = false;
                let firstY = null;

                for (let c = 0; c < cols; c++) {
                    const curr = nodeCoords[l][r][c];

                    if (!curr) continue;

                    rowHasNodes = true;

                    if (firstY === null) {
                        firstY = curr.y;
                    }

                    actions.push({ type: 'fillStyle', value: '#333' });
                    actions.push({ type: 'font', size: 11, font: 'Arial' });
                    actions.push({
                        type: 'text',
                        value: String(layers[l].rows[r][c]),
                        pos: {
                            x: curr.x,
                            y: curr.y + 4
                        },
                        h_center: true
                    });
                }

                if (rowHasNodes && firstY !== null) {
                    actions.push({ type: 'fillStyle', value: '#999' });
                    actions.push({ type: 'font', size: 10, font: 'Arial' });
                    actions.push({
                        type: 'text',
                        value: makeOmegaLabel1Y(l, r),
                        pos: {
                            x: 4,
                            y: firstY + 4
                        }
                    });
                }
            }
        }

        return {
            width,
            height,
            actions
        };
    }

    function drawDiagram1Y(seq) {
        if (!Array.isArray(seq) || seq.length === 0) {
            return undefined;
        }

        const values = seqToValuesForDiagram1Y(seq);

        if (values.length === 0) {
            return undefined;
        }

        let mountain;

        try {
            mountain = new YMountainDiagram1Y(values);
        } catch {
            return undefined;
        }

        const body = drawMountainActions1YCompact(mountain, 0);
        const padding = 6;

        return {
            width: body.width + padding * 2,
            height: body.height + padding * 2,
            noLimitX: true,
            actions: [
                { type: 'fillStyle', value: 'white' },
                {
                    type: 'fillRect',
                    value: {
                        x: 0,
                        y: 0,
                        w: body.width + padding * 2,
                        h: body.height + padding * 2
                    }
                },
                ...shiftDiagramActions1Y(body.actions, padding, padding)
            ]
        };
    }

    function shiftDiagramActions1Y(actions, dx, dy) {
        return actions.map(action => {
            const a = JSON.parse(JSON.stringify(action));

            if (a.type === 'line') {
                a.start.x += dx;
                a.start.y += dy;
                a.end.x += dx;
                a.end.y += dy;
            } else if (a.type === 'text') {
                a.pos.x += dx;
                a.pos.y += dy;
            } else if (a.type === 'circle') {
                a.center.x += dx;
                a.center.y += dy;
            } else if (
                a.type === 'fillRect' ||
                a.type === 'strokeRect' ||
                a.type === 'clearRect'
            ) {
                a.value.x += dx;
                a.value.y += dy;
            }

            return a;
        });
    }

    registerNotation({
        id: '1Y',
        name: '1-Y',
        placeholder: '例如：1,2,4,8,10,8',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return parseY(input);
        },

        format(seq) {
            return formatY(seq);
        },

        formatToken(token) {
            return formatYToken(token);
        },

        separator() {
            return ',';
        },

        compareSeq(a, b) {
            return compareYSeq(a, b);
        },

        getBadRootIndex(seq) {
            try {
                const s = seqToString(seq);
                const mountain = calcMountain(s);
                const lastTop = mountain[0][mountain[0].length - 1];

                if (!lastTop || lastTop.parentIndex === -1) {
                    return -1;
                }

                const idx = getBadRoot(s);
                return idx >= 0 ? idx : -1;
            } catch {
                return -1;
            }
        },

        isSuccessor(seq) {
            if (!seq || seq.length === 0) return true;

            try {
                const mountain = calcMountain(seqToString(seq));
                const lastTop = mountain[0][mountain[0].length - 1];

                return !lastTop || lastTop.parentIndex === -1;
            } catch {
                return true;
            }
        },

        countStep(seq) {
            const expanded = this.expand(clone(seq), 1);

            if (!expanded || !expanded.groups || !expanded.groups[0] || expanded.groups[0].length === 0) {
                return expanded && expanded.result ? expanded.result : seq;
            }

            return seq.slice(0, -1).concat([clone(expanded.groups[0][0])]);
        },

        expand(seq, times) {
            return expandY(seq, times);
        },
        
        drawDiagram(seq) {
            return drawDiagram1Y(seq);
        },

        limit: {
            initial() {
                return [
                    makeYLimitItem(2),
                    makeYLimitItem(3),
                    makeYLimitItem(4)
                ];
            },

            extend(seq) {
                const last = seq.length > 0
                    ? seq[seq.length - 1].n
                    : 1;

                return [
                    ...seq,
                    makeYLimitItem(last + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isYLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();