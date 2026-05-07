/* ============================================================
   IBMS
============================================================ */

(function() {
    let ancestorCache = new Map();

    function clearAncestorCache() {
        ancestorCache.clear();
    }

    function cloneMatrix(matrix) {
        return matrix.map(col => [...col]);
    }

    function isCellSeq(seq) {
        return Array.isArray(seq)
            && seq.length > 0
            && typeof seq[0] === 'object'
            && seq[0] !== null
            && 'v' in seq[0]
            && 'col' in seq[0]
            && 'row' in seq[0];
    }

    function columnsToCells(columns) {
        const cells = [];

        for (let c = 0; c < columns.length; c++) {
            const col = columns[c];
            const colHeight = col.length;

            for (let r = 0; r < col.length; r++) {
                cells.push({
                    v: col[r],
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return cells;
    }

    function cellsToMatrix(cells) {
        if (!cells || cells.length === 0) return [];

        let maxCol = -1;
        let maxRow = -1;

        cells.forEach(cell => {
            maxCol = Math.max(maxCol, cell.col);
            maxRow = Math.max(maxRow, cell.row);
        });

        const matrix = Array.from(
            { length: maxCol + 1 },
            () => new Array(maxRow + 1).fill(0)
        );

        cells.forEach(cell => {
            matrix[cell.col][cell.row] = cell.v;
        });

        return matrix;
    }

    function matrixToCells(matrix) {
        if (!matrix || matrix.length === 0) return [];

        const rows = matrix[0].length;
        const cells = [];

        for (let c = 0; c < matrix.length; c++) {
            let lastSig = 0;

            for (let r = rows - 1; r >= 0; r--) {
                if (matrix[c][r] !== 0) {
                    lastSig = r;
                    break;
                }
            }

            const colHeight = lastSig + 1;

            for (let r = 0; r <= lastSig; r++) {
                cells.push({
                    v: matrix[c][r],
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return cells;
    }

    function cellsToString(cells) {
        if (!cells || cells.length === 0) return '';

        let maxCol = -1;

        cells.forEach(cell => {
            maxCol = Math.max(maxCol, cell.col);
        });

        const cols = Array.from({ length: maxCol + 1 }, () => []);

        cells.forEach(cell => {
            cols[cell.col][cell.row] = cell.v;
        });

        return cols.map(col => {
            let actualMax = -1;

            for (let r = col.length - 1; r >= 0; r--) {
                if (col[r] !== undefined) {
                    actualMax = r;
                    break;
                }
            }

            if (actualMax === -1) return '(0)';

            const shown = [];

            for (let r = 0; r <= actualMax; r++) {
                shown.push(col[r] ?? 0);
            }

            while (shown.length > 1 && shown[shown.length - 1] === 0) {
                shown.pop();
            }

            return '(' + shown.join(',') + ')';
        }).join('');
    }

    function trimColumn(col) {
        const x = [...(col || [])];

        while (x.length > 1 && x[x.length - 1] === 0) {
            x.pop();
        }

        return x;
    }

    function compareVectorsLexicographically(v1, v2) {
        const len = Math.min(v1.length, v2.length);

        for (let i = 0; i < len; i++) {
            if (v1[i] < v2[i]) return -1;
            if (v1[i] > v2[i]) return 1;
        }

        if (v1.length < v2.length) return -1;
        if (v1.length > v2.length) return 1;
        return 0;
    }

    function compareMatricesLexicographically(M1, M2) {
        const minCols = Math.min(M1.length, M2.length);

        for (let i = 0; i < minCols; i++) {
            const cmp = compareVectorsLexicographically(
                trimColumn(M1[i]),
                trimColumn(M2[i])
            );

            if (cmp !== 0) return cmp;
        }

        if (M1.length < M2.length) return -1;
        if (M1.length > M2.length) return 1;
        return 0;
    }

    function parseIBMS(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的 IBMS 矩阵，例如：(0)(1,1,1)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的 IBMS 矩阵，例如：(0)(1,1,1)');
            }

            const j = t.indexOf(')', i + 1);

            if (j === -1) {
                throw new Error('请输入有效的 IBMS 矩阵，例如：(0)(1,1,1)');
            }

            const content = t.slice(i + 1, j).trim();
            let col;

            if (content === '') {
                col = [0];
            } else {
                const parts = content.split(',').map(s => s.trim());

                if (parts.some(p => !/^\d+$/.test(p))) {
                    throw new Error('列中包含无效自然数');
                }

                col = parts.map(Number);
            }

            columns.push(col);
            i = j + 1;
        }

        const maxRows = Math.max(1, ...columns.map(c => c.length));

        let matrix = columns.map(col => {
            const ext = [...col];
            while (ext.length < maxRows) ext.push(0);
            return ext;
        });

        validateIBMSMatrix(matrix);
        return matrixToCells(matrix);
    }

    function validateIBMSMatrix(matrix) {
        if (!matrix || matrix.length === 0) {
            throw new Error('表达式为空');
        }

        const rows = matrix[0].length;

        const firstCol = matrix[0];
        for (let r = 0; r < rows; r++) {
            if (firstCol[r] !== 0) {
                throw new Error('IBMS 首列必须全为零');
            }
        }

        for (let c = 0; c < matrix.length; c++) {
            const col = matrix[c];

            for (let r = 1; r < rows; r++) {
                if (col[r] > col[r - 1]) {
                    throw new Error(
                        `第${c + 1}列不满足单调不增`
                    );
                }
            }
        }

    }

    function hasNonZeroBeyondRow3(matrix) {
        const rows = matrix[0].length;

        if (rows <= 3) return false;

        for (const col of matrix) {
            for (let r = 3; r < rows; r++) {
                if (col[r] !== 0) return true;
            }
        }

        return false;
    }

    function truncateTo3RowsIfPossible(matrix) {
        if (matrix[0].length <= 3) return matrix;
        return matrix.map(col => col.slice(0, 3));
    }

    function getZeroParent(colIndex) {
        return colIndex > 0 ? colIndex - 1 : null;
    }

    function getBParent(matrix, colIndex, b) {
        const numRows = matrix[0].length;
        const rowIdx = b - 1;

        if (rowIdx >= numRows) return null;

        const c = matrix[colIndex][rowIdx];
        const ancestors = getAAncestors(matrix, colIndex, b - 1);

        let bestCol = null;
        let bestIdx = -1;

        for (const ancCol of ancestors) {
            if (ancCol >= colIndex) continue;

            const d = matrix[ancCol][rowIdx];

            if (d < c) {
                if (ancCol > bestIdx) {
                    bestIdx = ancCol;
                    bestCol = ancCol;
                }
            }
        }

        return bestCol;
    }

    function getAAncestors(matrix, colIndex, a) {
        const cacheKey = colIndex + '_' + a;

        if (ancestorCache.has(cacheKey)) {
            return ancestorCache.get(cacheKey);
        }

        const ancestors = new Set();
        ancestors.add(colIndex);

        let changed = true;
        const maxIter = matrix.length + 10;
        let iter = 0;

        while (changed && iter < maxIter) {
            changed = false;
            iter++;

            const current = [...ancestors];

            for (const c of current) {
                let parent = null;

                if (a === 0) {
                    parent = getZeroParent(c);
                } else {
                    parent = getBParent(matrix, c, a);
                }

                if (parent !== null && !ancestors.has(parent)) {
                    ancestors.add(parent);
                    changed = true;
                }
            }
        }

        ancestorCache.set(cacheKey, ancestors);
        return ancestors;
    }

    function findBadRoot(matrix) {
        clearAncestorCache();

        const numCols = matrix.length;
        const numRows = matrix[0].length;
        const lastCol = matrix[numCols - 1];

        let t = null;

        for (let r = numRows - 1; r >= 0; r--) {
            if (lastCol[r] !== 0) {
                t = r + 1;
                break;
            }
        }

        if (t === null) return null;

        const rootColIndex = getBParent(matrix, numCols - 1, t);

        if (rootColIndex === null) return null;

        return { rootColIndex, t };
    }

    function bmsVerificationRoot(matrix, colIndex, rowLabel, badRootColIndex) {
        const ancestors = getAAncestors(matrix, colIndex, rowLabel);
        return ancestors.has(badRootColIndex) ? 1 : 0;
    }

    function computeIBMSVerificationForBadRoot(matrix, rootColIndex, t, lastColIndex) {
        const veri = Array(matrix.length)
            .fill()
            .map(() => [undefined, undefined]);

        for (let ci = rootColIndex; ci < lastColIndex; ci++) {
            if (1 < t) {
                veri[ci][0] = 1;
            }

            if (2 < t) {
                veri[ci][1] = computeIBMSRow2Verification(
                    ci,
                    matrix,
                    rootColIndex,
                    t,
                    lastColIndex,
                    veri
                );
            }
        }

        return veri;
    }

    function computeIBMSRow2Verification(colIndex, matrix, rootColIndex, t, lastColIndex, veri) {
        if (colIndex === rootColIndex) return 1;

        const a = matrix[colIndex][1];

        if (a === 0) return 0;

        const h = matrix[colIndex][0];
        const i = matrix[colIndex][2];
        const e = matrix[lastColIndex][2];
        const g = matrix[rootColIndex][1];

        const ancestors2 = getAAncestors(matrix, colIndex, 2);
        const includesR = ancestors2.has(rootColIndex);
        const bParentIsR = getBParent(matrix, colIndex, 2) === rootColIndex;

        const hasAncestorWithRow2Veri0 = () => {
            for (const anc of ancestors2) {
                if (
                    anc >= rootColIndex &&
                    anc < lastColIndex &&
                    veri[anc] &&
                    veri[anc][1] === 0
                ) {
                    return true;
                }
            }

            return false;
        };

        if (i < e) {
            if (!includesR || bParentIsR || hasAncestorWithRow2Veri0()) return 0;
            return 1;
        }

        if (a <= g) return 0;

        if (a > g + 1) {
            if (!includesR || hasAncestorWithRow2Veri0()) return 0;
            return 1;
        }

        const lAncestors2 = getAAncestors(matrix, lastColIndex, 2);

        let C_colIndex = null;
        let maxC = -1;

        for (const anc of lAncestors2) {
            if (matrix[anc][1] === g + 1 && anc > maxC) {
                maxC = anc;
                C_colIndex = anc;
            }
        }

        if (C_colIndex === null) return 0;

        const baseline = matrix
            .slice(C_colIndex, lastColIndex + 1)
            .map(col => [...col]);

        const targetVec = [h + 1, a + 1, i];

        let D_colIndex = null;

        for (let idx = colIndex + 1; idx < matrix.length; idx++) {
            if (compareVectorsLexicographically(matrix[idx], targetVec) < 0) {
                D_colIndex = idx;
                break;
            }
        }

        const testPiece = D_colIndex !== null
            ? matrix.slice(colIndex, D_colIndex).map(col => [...col])
            : matrix.slice(colIndex, lastColIndex + 1).map(col => [...col]);

        const j = matrix[C_colIndex][0];

        const modifiedBaseline = baseline.map(col => [...col]);
        const modifiedTest = testPiece.map(col => [...col]);

        if (h > j) {
            const diff = h - j;
            for (const col of modifiedBaseline) col[0] += diff;
        } else if (h < j) {
            const diff = j - h;
            for (const col of modifiedTest) col[0] += diff;
        }

        if (compareMatricesLexicographically(modifiedBaseline, modifiedTest) > 0) {
            return 0;
        }

        if (!includesR || hasAncestorWithRow2Veri0()) return 0;

        return 1;
    }

    function generateBh(B, delta, t, h, badRootColIndexInOriginal, originalMatrix, getK) {
        const numRows = B[0].length;

        return B.map((col, colLocalIdx) => {
            const colInOriginal = badRootColIndexInOriginal + colLocalIdx;
            const newCol = [];

            for (let r = 0; r < numRows; r++) {
                const rowLabel = r + 1;
                const iVal = col[r];
                const j = delta[r];
                const k = rowLabel < t ? getK(colInOriginal, rowLabel) : 0;

                newCol.push(iVal + h * j * k);
            }

            return newCol;
        });
    }

    function expandIBMSRaw(matrix, n) {
        clearAncestorCache();

        validateIBMSMatrix(matrix);

        if (matrix[0].length > 3) {
            matrix = truncateTo3RowsIfPossible(matrix);
        }

        const numCols = matrix.length;
        const numRows = matrix[0].length;

        if (numCols === 0) {
            return {
                type: 'successor',
                newMatrix: []
            };
        }

        const lastCol = matrix[numCols - 1];
        const isAllZero = lastCol.every(v => v === 0);

        if (isAllZero) {
            return {
                type: 'successor',
                newMatrix: matrix.slice(0, numCols - 1)
            };
        }

        const badRootResult = findBadRoot(matrix);

        if (badRootResult === null) {
            return {
                type: 'invalid',
                reason: '无法找到坏根'
            };
        }

        const { rootColIndex, t } = badRootResult;

        const G = matrix.slice(0, rootColIndex);
        const B = matrix.slice(rootColIndex, numCols - 1);

        const delta = [];
        const rootCol = matrix[rootColIndex];

        for (let r = 0; r < numRows; r++) {
            const rowLabel = r + 1;
            delta.push(rowLabel >= t ? 0 : lastCol[r] - rootCol[r]);
        }

        let getK;

        if (t === 1 || t === 2) {
            getK = (colIdx, rowLabel) => {
                return bmsVerificationRoot(
                    matrix,
                    colIdx,
                    rowLabel,
                    rootColIndex
                );
            };
        } else if (t === 3) {
            const veriMap = computeIBMSVerificationForBadRoot(
                matrix,
                rootColIndex,
                t,
                numCols - 1
            );

            getK = (colIdx, rowLabel) => {
                if (rowLabel >= t) return 0;

                const rowIdx = rowLabel - 1;

                if (
                    colIdx >= rootColIndex &&
                    colIdx < numCols - 1 &&
                    veriMap[colIdx] &&
                    veriMap[colIdx][rowIdx] !== undefined
                ) {
                    return veriMap[colIdx][rowIdx];
                }

                return 0;
            };
        } else {
            getK = (colIdx, rowLabel) => {
                if (rowLabel >= t) return 0;
                return bmsVerificationRoot(matrix, colIdx, rowLabel, rootColIndex);
            };
        }

        const BhList = [];

        for (let h = 1; h <= n; h++) {
            BhList.push(
                generateBh(
                    B,
                    delta,
                    t,
                    h,
                    rootColIndex,
                    matrix,
                    getK
                )
            );
        }

        const newMatrix = [
            ...G.map(col => [...col]),
            ...B.map(col => [...col])
        ];

        for (const Bh of BhList) {
            for (const col of Bh) {
                newMatrix.push([...col]);
            }
        }

        return {
            type: 'limit',
            newMatrix,
            rootColIndex,
            t,
            goodMatrix: [
                ...G.map(col => [...col]),
                ...B.map(col => [...col])
            ],
            BhList
        };
    }

    function cellsInColumnRange(cells, startCol, endCol) {
        return cells.filter(cell => cell.col >= startCol && cell.col <= endCol);
    }

    function expandIBMS(matrix, times) {
        const cols = matrix.length;

        if (cols === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1
            };
        }

        const raw = expandIBMSRaw(cloneMatrix(matrix), times);

        if (raw.type === 'invalid') {
            throw new Error(raw.reason || 'IBMS 展开失败');
        }

        if (raw.type === 'successor') {
            const goodCells = matrixToCells(raw.newMatrix);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1
            };
        }

        const resultCells = matrixToCells(raw.newMatrix);
        const goodCells = matrixToCells(raw.goodMatrix);

        const BWidth = raw.BhList.length > 0 ? raw.BhList[0].length : 0;
        const goodCols = raw.goodMatrix.length;

        const groups = [];

        for (let h = 0; h < raw.BhList.length; h++) {
            const startCol = goodCols + h * BWidth;
            const endCol = startCol + BWidth - 1;
            groups.push(cellsInColumnRange(resultCells, startCol, endCol));
        }

        const badRootIndex = resultCells.findIndex(
            cell => cell.col === raw.rootColIndex
        );

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: raw.rootColIndex
        };
    }

    function makeIBMSLimitColumn(c) {
        // c = 0 -> (0)
        if (c === 0) return [0];
    
        // c = 1 -> (1,1,1)
        // c = 2 -> (2,2,2)
        // c = 3 -> (3,3,3)
        return [c, c, c];
    }
    
    function makeIBMSLimitToken(c) {
        return {
            type: 'ibms-limit-token',
            colIndex: c,
            col: makeIBMSLimitColumn(c)
        };
    }
    
    function isIBMSLimitToken(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'ibms-limit-token';
    }
    
    function isIBMSLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isIBMSLimitToken(seq[0]);
    }
    
    function formatIBMSLimitToken(token) {
        return '(' + token.col.join(',') + ')';
    }
    
    function ibmsLimitSeqToCells(seq) {
        const columns = seq.map(token => token.col);
        return columnsToCells(columns);
    }

    registerNotation({
        id: 'IBMS',
        name: 'IBMS(before TSSO)',
        placeholder: '例如：(0)(1,1,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseIBMS(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
        
            if (isIBMSLimitSeq(seq)) {
                return 'sup{' + seq.map(formatIBMSLimitToken).join('') + ',...}';
            }
        
            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }
        
            return cellsToString(matrixToCells(seq));
        },

        formatToken(token) {
            if (isIBMSLimitToken(token)) {
                return formatIBMSLimitToken(token);
            }
        
            const isLast = token.row === token.colHeight - 1;
        
            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }
        
            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (isIBMSLimitToken(curr) || isIBMSLimitToken(next)) {
                return '';
            }
        
            if (
                curr &&
                next &&
                curr.row !== undefined &&
                next.row !== undefined &&
                next.row === 0
            ) {
                return '';
            }
        
            return ',';
        },

        getTokenGroupKey(token, index) {
            if (isIBMSLimitToken(token)) {
                return index;
            }
        
            return token.col;
        },

        compareSeq(a, b) {
            const ma = isCellSeq(a) ? cellsToMatrix(a) : a;
            const mb = isCellSeq(b) ? cellsToMatrix(b) : b;

            return compareMatricesLexicographically(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;

                if (!matrix || matrix.length === 0) return -1;
                if (matrix[matrix.length - 1].every(v => v === 0)) return -1;

                const bad = findBadRoot(matrix);
                if (!bad) return -1;

                const cells = isCellSeq(seq) ? seq : matrixToCells(matrix);

                return cells.findIndex(cell => cell.col === bad.rootColIndex);
            } catch {
                return -1;
            }
        },

        isBadRootToken(record, index) {
            if (!record || !record.result) return false;

            const cur = record.result[index];
            if (!cur) return false;

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
            if (!bad) return false;

            return cur.col === bad.col;
        },

        getHoverTargetIndices(seq, badIndex) {
            if (!seq || badIndex < 0) return [];

            const bad = seq[badIndex];
            if (!bad || bad.col === undefined) return [badIndex];

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

            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
            if (!matrix || matrix.length === 0) return true;

            const lastCol = matrix[matrix.length - 1];
            return lastCol.every(v => v === 0);
        },

        countStep(seq) {
            const expanded = this.expand(clone(seq), 1);

            if (!expanded || !expanded.result) return seq;

            const result = expanded.result;
            const goodLength = expanded.goodLength ?? 0;

            if (goodLength >= result.length) return result;

            const firstNewCell = result[goodLength];
            if (!firstNewCell || firstNewCell.col === undefined) return result;

            const targetCol = firstNewCell.col;
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
            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
            return expandIBMS(matrix, times);
        },

        limit: {
            initial() {
                const count = 4;
        
                return Array.from(
                    { length: count },
                    (_, i) => makeIBMSLimitToken(i)
                );
            },
        
            extend(seq) {
                return [
                    ...seq,
                    makeIBMSLimitToken(seq.length)
                ];
            },
        
            select(seq, index) {
                if (!seq || index < 0 || index >= seq.length) {
                    return [];
                }
        
                const selected = seq.slice(0, index + 1);
        
                return ibmsLimitSeqToCells(selected);
            }
        }
    });
})();