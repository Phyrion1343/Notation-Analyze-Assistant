(function() {
    function compareSegments(segA, segB) {
        const minCols = Math.min(segA.length, segB.length);
        for (let c = 0; c < minCols; c++) {
            const colA = segA[c] || [], colB = segB[c] || [];
            const maxR = Math.max(colA.length, colB.length);
            for (let r = 0; r < maxR; r++) {
                const valA = r < colA.length ? colA[r] : 0;
                const valB = r < colB.length ? colB[r] : 0;
                if (valA < valB) return -1;
                if (valA > valB) return 1;
            }
        }
        if (segA.length < segB.length) return -1;
        if (segA.length > segB.length) return 1;
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

    function flattenMatrix(matrix) {
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

    // 精确截断格式化。
    // 点击 (3,2,1) 的 3 后，可得到 (0)(1,1,1)(2,2,0)(3)
    function cellsToString(cells) {
        if (!cells || cells.length === 0) return '';

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

        const actualHeight = new Array(maxCol + 1).fill(0);

        cells.forEach(cell => {
            matrix[cell.col][cell.row] = cell.v;
            actualHeight[cell.col] = Math.max(actualHeight[cell.col], cell.row + 1);
        });

        return matrix.map((col, c) => {
            const height = c === maxCol ? actualHeight[c] : maxRow + 1;
            let shown = col.slice(0, height);

            if (shown.every(v => v === 0)) {
                return '(0)';
            }

            return '(' + shown.join(',') + ')';
        }).join('');
    }

    function parseWSM(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)(2,2)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)(2,2)');
            }

            const j = t.indexOf(')', i + 1);
            if (j === -1) {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)(2,2)');
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

    function makeWSMLimitItem(n) {
        return {
            type: 'wsm-limit-item',
            n,
            expr: columnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }
    
    function isWSMLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'wsm-limit-item';
    }
    
    function isWSMLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isWSMLimitItem(seq[0]);
    }
    
    function formatWSMLimitItem(item) {
        return '(0)(' + Array(item.n).fill(1).join(',') + ')';
    }

    function expandMatrix(matrix, times) {
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

        // 1. 严格父节点矩阵
        const parents = Array.from({ length: rows }, () => Array(cols).fill(-1));

        for (let c = 1; c < cols; c++) {
            const val = matrix[c][0];
            for (let k = c - 1; k >= 0; k--) {
                if (matrix[k][0] < val) {
                    parents[0][c] = k;
                    break;
                }
            }
        }

        for (let r = 1; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const val = matrix[c][r];
                let chainIndex = c;

                while (chainIndex !== -1) {
                    if (chainIndex !== c && matrix[chainIndex][r] < val) {
                        parents[r][c] = chainIndex;
                        break;
                    }

                    chainIndex = parents[r - 1][chainIndex];
                }
            }
        }

        // 2. 末列全零
        const lastColIdx = cols - 1;

        if (matrix[lastColIdx].every(val => val === 0)) {
            const goodMatrix = matrix.slice(0, lastColIdx);
            const goodCells = flattenMatrix(goodMatrix);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1
            };
        }

        // 3. 基本定义
        let targetRow = -1;

        for (let r = rows - 1; r >= 0; r--) {
            if (matrix[lastColIdx][r] !== 0) {
                targetRow = r;
                break;
            }
        }

        const availableItemCols = [];
        let currAnc = lastColIdx;

        while (currAnc !== -1) {
            availableItemCols.push(currAnc);
            currAnc = parents[targetRow][currAnc];
        }

        const targetParentIdx = parents[targetRow][lastColIdx];

        if (targetParentIdx < 0) {
            throw new Error('该矩阵无法展开：目标项没有父节点');
        }

        const rawDiffCol = new Array(rows).fill(0);

        for (let r = 0; r < rows; r++) {
            const diff = matrix[lastColIdx][r] - matrix[targetParentIdx][r];

            if (diff < 0) {
                rawDiffCol[r] = 0;
                break;
            }

            rawDiffCol[r] = diff;
        }

        let maxNonZeroRow = -1;

        for (let r = rows - 1; r >= 0; r--) {
            if (rawDiffCol[r] !== 0) {
                maxNonZeroRow = r;
                break;
            }
        }

        if (maxNonZeroRow !== -1) {
            rawDiffCol[maxNonZeroRow] = 0;
        }

        const diffGenCol = rawDiffCol.map((v, r) => v + matrix[targetParentIdx][r]);

        function getDiffCol(rootColIdx) {
            const diffCol = new Array(rows).fill(0);

            for (let r = 0; r < rows; r++) {
                const d = diffGenCol[r] - matrix[rootColIdx][r];

                if (d < 0) {
                    diffCol[r] = 0;
                    break;
                }

                diffCol[r] = d;
            }

            return diffCol;
        }

        function getComparisonSegment(rootColIdx) {
            const diffCol = getDiffCol(rootColIdx);
            const subWidth = lastColIdx - rootColIdx;
            const segment = [];

            for (let c = 0; c < subWidth; c++) {
                const actualC = rootColIdx + c;
                const colData = [];

                for (let r = 0; r < rows; r++) {
                    let hasRoot = false;
                    let curr = actualC;

                    while (curr !== -1) {
                        if (curr === rootColIdx) {
                            hasRoot = true;
                            break;
                        }

                        curr = parents[r][curr];
                    }

                    colData.push(matrix[actualC][r] + (hasRoot ? diffCol[r] : 0));
                }

                segment.push(colData);
            }

            segment.push(matrix[lastColIdx].map((v, r) => v + diffCol[r]));
            return segment;
        }

        // 4. 广义父节点矩阵
        const generalizedAncestors = Array.from(
            { length: rows },
            () => Array.from({ length: cols }, () => [])
        );

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const list = [];
                const strictAncB = [];

                let p = parents[r][c];
                while (p !== -1) {
                    strictAncB.push(p);
                    p = parents[r][p];
                }

                for (let k = 0; k < c; k++) {
                    if (matrix[k][r] < matrix[c][r]) {
                        let upperValid = true;

                        if (r > 0) {
                            let isStrictAncAbove = false;
                            let trace = parents[r - 1][c];

                            while (trace !== -1) {
                                if (trace === k) {
                                    isStrictAncAbove = true;
                                    break;
                                }

                                trace = parents[r - 1][trace];
                            }

                            upperValid = isStrictAncAbove;
                        }

                        if (upperValid) {
                            const parentOfK = parents[r][k];

                            if (parentOfK === -1 || strictAncB.includes(parentOfK)) {
                                list.push(k);
                            }
                        }
                    }
                }

                generalizedAncestors[r][c] = list;
            }
        }

        // 5. 寻找坏项
        const standardSeg = getComparisonSegment(targetParentIdx);
        const candidates = [...generalizedAncestors[targetRow][lastColIdx]]
            .sort((a, b) => b - a);

        let badItemIdx = -1;

        for (const cand of candidates) {
            if (compareSegments(getComparisonSegment(cand), standardSeg) < 0) {
                const rightAvailable = availableItemCols.filter(ac => ac > cand);

                badItemIdx = rightAvailable.length > 0
                    ? Math.min(...rightAvailable)
                    : availableItemCols[availableItemCols.length - 1];

                break;
            }
        }

        if (badItemIdx === -1) {
            badItemIdx = availableItemCols[availableItemCols.length - 1];
        }

        // 6. 生成结果
        const goodMatrix = matrix.slice(0, lastColIdx);
        const badDiffCol = getDiffCol(badItemIdx);
        const subWidth = lastColIdx - badItemIdx;

        const mask = [];

        for (let c = 0; c < subWidth; c++) {
            const actualC = badItemIdx + c;
            const colMask = [];

            for (let r = 0; r < rows; r++) {
                let hasAnc = false;
                let t = actualC;

                while (t !== -1) {
                    if (t === badItemIdx) {
                        hasAnc = true;
                        break;
                    }

                    t = parents[r][t];
                }

                colMask.push(hasAnc ? 1 : 0);
            }

            mask.push(colMask);
        }

        const resultMatrix = [...goodMatrix];
        const groups = [];

        for (let k = 1; k <= times; k++) {
            const kSeg = [];

            for (let c = 0; c < subWidth; c++) {
                const actualC = badItemIdx + c;
                const newCol = [];

                for (let r = 0; r < rows; r++) {
                    newCol.push(matrix[actualC][r] + k * badDiffCol[r] * mask[c][r]);
                }

                kSeg.push(newCol);
            }

            resultMatrix.push(...kSeg);
            groups.push(flattenMatrix(kSeg));
        }

        const resultCells = flattenMatrix(resultMatrix);
        const goodCells = flattenMatrix(goodMatrix);

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex: resultCells.findIndex(cell => cell.col === badItemIdx && cell.row === 0),
            badRootColIndex: badItemIdx
        };
    }

    registerNotation({
        id: 'WSM',
        name: 'WSM',
        placeholder: '例如：(0)(1,1,1)(2,2)',
        defaultTimes: 3,
        lexDesc: true,

        // 需要框架支持 compactTokens
        compactTokens: true,

        parse(input) {
            return parseWSM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
        
            // WSM 极限表达式
            if (isWSMLimitSeq(seq)) {
                return 'sup{' + seq.map(formatWSMLimitItem).join(',') + ',...}';
            }
        
            // 普通 WSM cell 序列
            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }
        
            // 兼容矩阵格式
            return cellsToString(flattenMatrix(seq));
        },

        formatToken(token) {
            // 极限表达式中的一项
            if (isWSMLimitItem(token)) {
                return formatWSMLimitItem(token);
            }
        
            // 普通 WSM cell
            const isLast = token.row === token.colHeight - 1;
        
            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }
        
            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            // 极限表达式各项之间用逗号分隔：
            // sup{(0)(1),(0)(1,1),...}
            if (isWSMLimitItem(curr) || isWSMLimitItem(next)) {
                return ',';
            }
        
            // WSM 普通矩阵跨列时不加分隔符：
            // (0)(1,1,1)
            if (
                curr &&
                next &&
                curr.row !== undefined &&
                next.row !== undefined &&
                next.row === 0
            ) {
                return '';
            }
        
            // 同一列内部加逗号：
            // (1,1,1)
            return ',';
        },

        getTokenGroupKey(token, index) {
            // 极限表达式中，每个候选表达式是一项
            if (isWSMLimitItem(token)) {
                return index;
            }
        
            // 普通 WSM 中，同一 col 是同一列
            return token.col;
        },
        
        isBadRootToken(record, index) {
            if (!record || !record.result) return false;
            if (record.badRootIndex === undefined || record.badRootIndex < 0) return false;
        
            const bad = record.result[record.badRootIndex];
            const cur = record.result[index];
        
            if (!bad || !cur) return false;
        
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
        
        compareSeq(a, b) {
            const ma = isCellSeq(a) ? cellsToMatrix(a) : a;
            const mb = isCellSeq(b) ? cellsToMatrix(b) : b;

            return compareSegments(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
                const expanded = expandMatrix(matrix, 1);
                const badCol = expanded.badRootColIndex;

                if (badCol === undefined || badCol === null || badCol < 0) {
                    return -1;
                }

                const cells = isCellSeq(seq) ? seq : flattenMatrix(matrix);

                const idx = cells.findIndex(cell => cell.col === badCol && cell.row === 0);

                return idx >= 0 ? idx : -1;
            } catch {
                return -1;
            }
        },

        expand(seq, times) {
            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
            return expandMatrix(matrix, times);
        },

        isSuccessor(seq) {
            if (!seq || seq.length === 0) return true;
        
            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
            if (!matrix || matrix.length === 0) return true;
        
            const lastCol = matrix[matrix.length - 1];
        
            // WSM 后继序数：末列全 0
            return lastCol.every(v => v === 0);
        },
        
        countStep(seq) {
            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : clone(seq);
        
            if (!matrix || matrix.length === 0) return seq;
        
            const lastCol = matrix[matrix.length - 1];
        
            // 已经是后继序数，保持不动
            if (lastCol.every(v => v === 0)) {
                return isCellSeq(seq) ? flattenMatrix(matrix) : matrix;
            }
        
            // 用 WSM 自己的展开算法展开 1 次
            const expanded = expandMatrix(matrix, 1);
        
            if (!expanded || !expanded.result || expanded.result.length === 0) {
                return seq;
            }
        
            const result = expanded.result;
            const goodLength = expanded.goodLength ?? 0;
        
            // 如果没有展开部分，直接返回结果
            if (goodLength >= result.length) {
                return result;
            }
        
            // WSM 的计数步进：
            // 保留好部，然后取第一轮展开产生的“第一个完整矩阵列”
            //
            // expanded.result 形如：
            // 好部 + 第一轮第1列 + 第一轮第2列 + ...
            //
            // 对计数序列来说，只需要：
            // 好部 + 第一轮第1列
            const firstNewCell = result[goodLength];
        
            if (!firstNewCell || firstNewCell.col === undefined) {
                return result;
            }
        
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

        limit: {
            initial() {
                return [
                    makeWSMLimitItem(1),
                    makeWSMLimitItem(2),
                    makeWSMLimitItem(3)
                ];
            },
        
            extend(seq) {
                const nextN = seq.length + 1;
                return [
                    ...seq,
                    makeWSMLimitItem(nextN)
                ];
            },
        
            select(seq, index) {
                const item = seq[index];
        
                if (!isWSMLimitItem(item)) return [];
        
                return item.expr;
            }
        },
    });
})();