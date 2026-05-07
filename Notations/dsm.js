/* ============================================================
   DSM / Diagonal Sudden Matrix
============================================================ */

(function() {
    function trimColumn(col) {
        if (!col || col.length === 0) return [];
        const newCol = [...col];
        while (newCol.length > 1 && newCol[newCol.length - 1] === 0) {
            newCol.pop();
        }
        return newCol;
    }

    function compareSegments(matrixA, matrixB) {
        const maxCols = Math.max(matrixA.length, matrixB.length);

        for (let c = 0; c < maxCols; c++) {
            const colA = trimColumn(matrixA[c] || []);
            const colB = trimColumn(matrixB[c] || []);

            const maxRows = Math.max(colA.length, colB.length);

            for (let r = 0; r < maxRows; r++) {
                const valA = r < colA.length ? colA[r] : 0;
                const valB = r < colB.length ? colB[r] : 0;

                if (valA < valB) return -1;
                if (valA > valB) return 1;
            }
        }

        return 0;
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

    function parseDSM(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的矩阵格式，例如：(0)(1)(2,1)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1)(2,1)');
            }

            const j = t.indexOf(')', i + 1);
            if (j === -1) {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1)(2,1)');
            }

            const content = t.slice(i + 1, j).trim();
            let col;

            if (content === '') {
                col = [0];
            } else {
                const parts = content.split(',').map(s => s.trim());

                if (parts.some(p => !/^-?\d+$/.test(p))) {
                    throw new Error('列中包含无效数字');
                }

                col = parts.map(Number);
            }

            columns.push(col);
            i = j + 1;
        }

        return columnsToCells(columns);
    }

    function getPredecessor(parents, r, c) {
        if (parents[r][c] !== -1 || r === 0) {
            return null;
        }

        const upRow = r - 1;
        let currCol = parents[upRow][c];

        while (currCol !== -1) {
            if (parents[upRow][currCol] !== -1 && parents[r][currCol] === -1) {
                return { r, c: currCol };
            }

            const nextCol = parents[upRow][currCol];

            if (nextCol === -1) {
                return { r: upRow, c: currCol };
            }

            currCol = nextCol;
        }

        return { r: upRow, c };
    }

    function constructMatrixValues(parents) {
        const cols = parents.length;
        const rows = parents[0].length;
        const matrix = Array.from({ length: cols }, () => Array(rows).fill(0));

        for (let c = 0; c < cols; c++) {
            for (let r = 0; r < rows; r++) {
                const p = parents[c][r];

                if (p === -1) {
                    matrix[c][r] = 0;
                } else {
                    matrix[c][r] = matrix[p][r] + 1;
                }
            }
        }

        return matrix;
    }

    function generateExpansion(parents, badRow, badCol, times) {
        const rows = parents[0].length;
        const cols = parents.length;
        const lastCol = cols - 1;

        let targetRow = -1;
        for (let r = rows - 1; r >= 0; r--) {
            if (parents[lastCol][r] !== -1) {
                targetRow = r;
                break;
            }
        }

        if (targetRow === -1) {
            return constructMatrixValues(parents);
        }

        const S = badCol;
        const E = lastCol;
        const segmentDist = E - S;

        let finalParentsMatrix = null;

        if (targetRow === badRow) {
            const parentsRM = Array.from({ length: rows }, () => Array(cols).fill(-1));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    parentsRM[r][c] = parents[c][r];
                }
            }

            const expandedRM = Array.from({ length: rows }, () => []);

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    expandedRM[r].push(parentsRM[r][c]);
                }
            }

            for (let i = 1; i <= times; i++) {
                const shiftAmount = i * segmentDist;

                for (let c = S; c <= E; c++) {
                    const newC = c + shiftAmount;
                    const currentLen = expandedRM[0].length;

                    for (let r = 0; r < rows; r++) {
                        const originalParent = parentsRM[r][c];
                        let newParent = originalParent;

                        if (c === S && r < targetRow) {
                            newParent = parentsRM[r][E] + shiftAmount - segmentDist;
                        } else if (originalParent >= badCol) {
                            newParent = originalParent + shiftAmount;
                        }

                        if (newC < currentLen) {
                            expandedRM[r][newC] = newParent;
                        } else {
                            expandedRM[r].push(newParent);
                        }
                    }
                }
            }

            finalParentsMatrix = Array.from(
                { length: expandedRM[0].length },
                () => Array(rows).fill(-1)
            );

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < expandedRM[r].length; c++) {
                    finalParentsMatrix[c][r] = expandedRM[r][c];
                }
            }
        } else {
            const parentsRM = Array.from({ length: rows }, () => Array(cols).fill(-1));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    parentsRM[r][c] = parents[c][r];
                }
            }

            let resultRM = Array.from({ length: rows }, () => Array(cols).fill(-1));

            for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                    resultRM[r][c] = parentsRM[r][c];
                }
            }

            for (let i = 1; i <= times; i++) {
                const shiftAmount = i * segmentDist;

                for (let c = S + 1; c <= E; c++) {
                    for (let r = 0; r < rows; r++) {
                        const newParentVal = !(r === targetRow && c === E)
                            ? (() => {
                                const originalParent = parentsRM[r][c];
                                return originalParent >= badCol
                                    ? originalParent + shiftAmount
                                    : originalParent;
                            })()
                            : -1;

                        resultRM[r].push(newParentVal);
                    }
                }
            }

            const currentCols = resultRM[0].length;
            const parentCol = parentsRM[targetRow][lastCol];

            const validCandidates = [];
            let scanNode = { r: targetRow, c: parentCol };

            while (true) {
                if (scanNode.r === badRow && scanNode.c > badCol) {
                    validCandidates.push(scanNode);
                }

                const pred = getPredecessor(parentsRM, scanNode.r, scanNode.c);
                if (pred === null) break;

                scanNode = pred;
            }

            const isRising = Array.from({ length: rows }, () => Array(cols).fill(false));
            const isBase = Array.from({ length: rows }, () => Array(cols).fill(false));

            for (const vc of validCandidates) {
                if (vc.r < rows && vc.c < cols) {
                    isRising[vc.r][vc.c] = true;
                    isBase[vc.r][vc.c] = true;
                }
            }

            isRising[badRow][badCol] = true;

            let changed = true;
            while (changed) {
                changed = false;

                for (let r = badRow; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (isRising[r][c]) continue;

                        let becomeRising = false;
                        const p = parentsRM[r][c];

                        if (p !== -1 && isRising[r][p]) {
                            becomeRising = true;
                        }

                        if (!becomeRising && r > badRow) {
                            const upP = parentsRM[r - 1][c];
                            if (upP !== -1 && isRising[r - 1][upP]) {
                                becomeRising = true;
                            }
                        }

                        if (!becomeRising && r < rows - 1) {
                            if (isRising[r + 1][c]) {
                                becomeRising = true;
                            }
                        }

                        if (becomeRising) {
                            isRising[r][c] = true;
                            changed = true;
                        }
                    }
                }
            }

            const queueBase = [];

            for (let c = 0; c < cols; c++) {
                if (parentsRM[badRow][c] === badCol) {
                    isBase[badRow][c] = true;
                }

                if (isBase[badRow][c]) {
                    queueBase.push(c);
                }
            }

            while (queueBase.length > 0) {
                const currParentCol = queueBase.shift();

                for (let c = 0; c < cols; c++) {
                    if (parentsRM[badRow][c] === currParentCol && !isBase[badRow][c]) {
                        isBase[badRow][c] = true;
                        queueBase.push(c);
                    }
                }
            }

            const R = targetRow - badRow;
            const C = lastCol - badCol;

            const finalRows = rows + R * times;
            const finalCols = currentCols;

            for (let r = rows; r < finalRows; r++) {
                resultRM.push(Array(finalCols).fill(-1));
            }

            for (let i = 1; i <= times; i++) {
                const rowShift = R * i;
                const colShift = C * i;

                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        if (isRising[r][c]) {
                            const newR = r + rowShift;
                            const newC = c + colShift;

                            let val = parentsRM[r][c];
                            if (val !== -1) {
                                val = val + colShift;
                            }

                            resultRM[newR][newC] = val;
                        }
                    }
                }

                for (let c = 0; c < cols; c++) {
                    if (isBase[badRow][c]) {
                        const newC = c + colShift;
                        const baseParent = parentsRM[badRow][c];
                        const newBaseParent = baseParent !== -1
                            ? baseParent + colShift
                            : badCol + colShift;

                        for (let k = 0; k < rowShift; k++) {
                            const newR = badRow + k;
                            resultRM[newR][newC] = newBaseParent;
                        }
                    }
                }
            }

            finalParentsMatrix = Array.from(
                { length: resultRM[0].length },
                () => Array(resultRM.length).fill(-1)
            );

            for (let r = 0; r < resultRM.length; r++) {
                for (let c = 0; c < resultRM[0].length; c++) {
                    finalParentsMatrix[c][r] = resultRM[r][c];
                }
            }
        }

        return constructMatrixValues(finalParentsMatrix);
    }

    function computeParents(matrix) {
        const cols = matrix.length;
        const rows = matrix[0].length;

        const matrixRM = Array.from({ length: rows }, () => Array(cols).fill(0));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                matrixRM[r][c] = matrix[c][r];
            }
        }

        const parents = Array.from({ length: rows }, () => Array(cols).fill(-1));

        for (let c = 1; c < cols; c++) {
            const val = matrixRM[0][c];

            for (let k = c - 1; k >= 0; k--) {
                if (matrixRM[0][k] < val) {
                    parents[0][c] = k;
                    break;
                }
            }
        }

        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const val = matrixRM[r][c];
                let chainIndex = c;

                while (chainIndex !== -1) {
                    if (chainIndex !== c && matrixRM[r][chainIndex] < val) {
                        parents[r][c] = chainIndex;
                        break;
                    }

                    chainIndex = parents[r - 1][chainIndex];
                }
            }
        }

        return parents;
    }

    function findBadItem(matrix) {
        const cols = matrix.length;
        const rows = matrix[0].length;
        const parents = computeParents(matrix);

        const targetCol = cols - 1;
        let targetRow = -1;

        for (let r = rows - 1; r >= 0; r--) {
            if (parents[r][targetCol] !== -1) {
                targetRow = r;
                break;
            }
        }

        if (targetRow === -1) return null;

        const parentCol = parents[targetRow][targetCol];
        if (parentCol === -1) return null;

        let candidatesPool = [];
        let options = [];

        let currItem = { r: targetRow, c: parentCol };
        candidatesPool.push(currItem);
        options.push(currItem);

        while (true) {
            const pred = getPredecessor(parents, currItem.r, currItem.c);
            if (pred === null) break;

            candidatesPool.push(pred);
            currItem = pred;
        }

        candidatesPool.sort((a, b) => b.c - a.c);

        let prevItemForOptions = { r: targetRow, c: targetCol };

        for (const item of candidatesPool) {
            if (item.r < prevItemForOptions.r) {
                options.push(item);
                prevItemForOptions = item;
            }
        }

        if (candidatesPool.length === 0 && parentCol !== -1) {
            options.push({ r: targetRow, c: parentCol });
        }

        const parentsColMajor = Array.from({ length: cols }, () => Array(rows).fill(-1));

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                parentsColMajor[c][r] = parents[r][c];
            }
        }

        if (options.length === 0) {
            return { r: targetRow, c: parentCol };
        }

        const standardSeg = generateExpansion(parentsColMajor, targetRow, parentCol, 1);

        for (const cand of candidatesPool) {
            const candSeg = generateExpansion(parentsColMajor, cand.r, cand.c, 1);

            if (compareSegments(candSeg, standardSeg) < 0) {
                const rightOptions = options.filter(opt => opt.c > cand.c);

                if (rightOptions.length > 0) {
                    rightOptions.sort((a, b) => a.c - b.c);
                    return rightOptions[0];
                }

                return options[options.length - 1];
            }
        }

        return options[options.length - 1];
    }

    function findVisibleCellIndexInBadColumn(cells, badCol, badRow) {
        if (!cells || badCol === undefined || badCol < 0) return -1;
    
        // 优先找精确坏项
        let idx = cells.findIndex(
            cell => cell.col === badCol && cell.row === badRow
        );
    
        if (idx >= 0) return idx;
    
        idx = cells.findIndex(
            cell => cell.col === badCol
        );
    
        return idx;
    }

    function expandMatrixDSM(matrix, times) {
        const cols = matrix.length;
    
        if (cols === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }
    
        const rows = matrix[0].length;
        const lastColIdx = cols - 1;
    
        if (matrix[lastColIdx].every(val => val === 0)) {
            const goodMatrix = matrix.slice(0, lastColIdx);
            const goodCells = matrixToCells(goodMatrix);
    
            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1
            };
        }
    
        const parents = computeParents(matrix);
        const badItem = findBadItem(matrix);
    
        if (!badItem) {
            const resultCells = matrixToCells(matrix);
    
            return {
                result: resultCells,
                goodLength: Math.max(resultCells.length - 1, 0),
                groups: [],
                badRootIndex: -1
            };
        }
    
        const parentsColMajor = Array.from({ length: cols }, () => Array(rows).fill(-1));
    
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                parentsColMajor[c][r] = parents[r][c];
            }
        }
    
        const goodMatrix = matrix.slice(0, lastColIdx);
        const goodCells = matrixToCells(goodMatrix);
    
        function expandedMatrixAt(k) {
            const m = generateExpansion(parentsColMajor, badItem.r, badItem.c, k);
    
            // 原版逻辑：最后要 pop 掉展开矩阵末列
            if (m && m.length > 0) {
                m.pop();
            }
    
            return m || [];
        }
    
        // 最终展开结果
        const finalMatrix = expandedMatrixAt(times);
        const resultCells = matrixToCells(finalMatrix);
    
        // 按每一轮生成 groups，恢复蓝绿交替
        const groups = [];
        let prevLen = goodCells.length;
    
        for (let k = 1; k <= times; k++) {
            const km = expandedMatrixAt(k);
            const kc = matrixToCells(km);
    
            const group = kc.slice(prevLen);
    
            groups.push(group);
            prevLen = kc.length;
        }
    
        const badRootIndex = findVisibleCellIndexInBadColumn(
            resultCells,
            badItem.c,
            badItem.r
        );
    
        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: badItem.c,
            badRootRowIndex: badItem.r
        };
    }

    function makeDSMLimitColumn(c) {
        // c = 0 -> [0]
        if (c === 0) return [0];
    
        // c = 1 -> [1]
        // c = 2 -> [2,1]
        // c = 3 -> [3,2,1]
        const col = [];
    
        for (let v = c; v >= 1; v--) {
            col.push(v);
        }
    
        return col;
    }
    
    function makeDSMLimitToken(c) {
        return {
            type: 'dsm-limit-token',
            colIndex: c,
            col: makeDSMLimitColumn(c)
        };
    }
    
    function isDSMLimitToken(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'dsm-limit-token';
    }
    
    function isDSMLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isDSMLimitToken(seq[0]);
    }
    
    function formatDSMLimitToken(token) {
        return '(' + token.col.join(',') + ')';
    }
    
    function dsmLimitSeqToCells(seq) {
        const columns = seq.map(token => token.col);
        return columnsToCells(columns);
    }

    registerNotation({
        id: 'DSM',
        name: 'DSM',
        placeholder: '例如：(0)(1)(2,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseDSM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
        
            if (isDSMLimitSeq(seq)) {
                return 'sup{' + seq.map(formatDSMLimitToken).join('') + ',...}';
            }
        
            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }
        
            return cellsToString(matrixToCells(seq));
        },

        formatToken(token) {
            if (isDSMLimitToken(token)) {
                return formatDSMLimitToken(token);
            }
        
            const isLast = token.row === token.colHeight - 1;
        
            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }
        
            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (isDSMLimitToken(curr) || isDSMLimitToken(next)) {
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
            if (isDSMLimitToken(token)) {
                return index;
            }
        
            return token.col;
        },

        compareSeq(a, b) {
            const ma = isCellSeq(a) ? cellsToMatrix(a) : a;
            const mb = isCellSeq(b) ? cellsToMatrix(b) : b;

            return compareSegments(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;

                if (!matrix || matrix.length === 0) return -1;
                if (matrix[matrix.length - 1].every(v => v === 0)) return -1;

                const badItem = findBadItem(matrix);
                if (!badItem) return -1;

                const cells = isCellSeq(seq) ? seq : matrixToCells(matrix);

                return findVisibleCellIndexInBadColumn(
                    cells,
                    badItem.c,
                    badItem.r
                );
            } catch {
                return -1;
            }
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
            return expandMatrixDSM(matrix, times);
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
        
            return bad.col === cur.col;
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

        limit: {
            initial() {
                const count = 4;
        
                // 初始显示：
                // (0)(1)(2,1)(3,2,1)
                return Array.from(
                    { length: count },
                    (_, i) => makeDSMLimitToken(i)
                );
            },
        
            extend(seq) {
                return [
                    ...seq,
                    makeDSMLimitToken(seq.length)
                ];
            },
        
            // 截取式：
            // 点击 (2,1)，返回 (0)(1)(2,1)
            select(seq, index) {
                if (!seq || index < 0 || index >= seq.length) {
                    return [];
                }
        
                const selected = seq.slice(0, index + 1);
        
                return dsmLimitSeqToCells(selected);
            }
        }
    });
})();