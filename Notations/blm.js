/* ============================================================
   BLM 
============================================================ */

(function() {
    function sequenceCompare(arr1, arr2) {
        const len = Math.min(arr1.length, arr2.length);

        for (let i = 0; i < len; i++) {
            if (arr1[i] < arr2[i]) return -1;
            if (arr1[i] > arr2[i]) return 1;
        }

        if (arr1.length < arr2.length) return -1;
        if (arr1.length > arr2.length) return 1;
        return 0;
    }

    function trimColumn(col) {
        if (!col || col.length === 0) return [0];

        const c = col.slice();

        while (c.length > 1 && c[c.length - 1] === 0) {
            c.pop();
        }

        return c;
    }

    function normalizeMatrix(matrix) {
        if (!Array.isArray(matrix) || matrix.length === 0) return [];

        const maxLen = Math.max(...matrix.map(col => col.length));

        return matrix.map(col => {
            const c = col.slice();

            while (c.length < maxLen) {
                c.push(0);
            }

            return c;
        });
    }

    function matrixCompare(m1, m2) {
        const a = normalizeMatrix(m1);
        const b = normalizeMatrix(m2);

        if (a.length === 0) {
            return b.length === 0 ? 0 : -1;
        }

        if (b.length === 0) {
            return 1;
        }

        const maxCols = Math.max(a.length, b.length);

        for (let c = 0; c < maxCols; c++) {
            let col1 = trimColumn(a[c] || []);
            let col2 = trimColumn(b[c] || []);

            const diff = col1.length - col2.length;

            if (diff > 0) {
                col2 = col2.concat(Array(diff).fill(0));
            } else if (diff < 0) {
                col1 = col1.concat(Array(-diff).fill(0));
            }

            const cmp = sequenceCompare(col1, col2);

            if (cmp !== 0) return cmp;
        }

        return 0;
    }

    function matrixToString(matrix) {
        if (!Array.isArray(matrix) || matrix.length === 0) return '';

        return matrix.map(col => {
            return '(' + trimColumn(col).join(',') + ')';
        }).join('');
    }

    function parseBLM(input) {
        let t = String(input).trim();
    
        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');
    
        t = t.replace(/\s+/g, '');
    
        if (!t) {
            throw new Error('请输入有效格式，例如：(0)(1,1,1)(2)');
        }
    
        const columns = [];
        let i = 0;
    
        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效格式，例如：(0)(1,1,1)(2)');
            }
    
            const j = t.indexOf(')', i + 1);
    
            if (j === -1) {
                throw new Error('请输入有效格式，例如：(0)(1,1,1)(2)');
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
    
        if (columns.length === 0) {
            throw new Error('请输入有效格式，例如：(0)(1,1,1)(2)');
        }
    
        return columnsToCells(columns);
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
    
        return normalizeMatrix(matrix);
    }
    
    function matrixToCells(matrix) {
        if (!matrix || matrix.length === 0) return [];
    
        const normalized = normalizeMatrix(matrix);
        const cells = [];
    
        for (let c = 0; c < normalized.length; c++) {
            const shown = trimColumn(normalized[c]);
            const colHeight = shown.length;
    
            for (let r = 0; r < shown.length; r++) {
                cells.push({
                    v: shown[r],
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
    
        const columns = Array.from({ length: maxCol + 1 }, () => []);
    
        cells.forEach(cell => {
            columns[cell.col][cell.row] = cell.v;
        });
    
        return columns.map(col => {
            let last = -1;
    
            for (let r = col.length - 1; r >= 0; r--) {
                if (col[r] !== undefined) {
                    last = r;
                    break;
                }
            }
    
            if (last < 0) return '(0)';
    
            const shown = [];
    
            for (let r = 0; r <= last; r++) {
                shown.push(col[r] ?? 0);
            }
    
            return '(' + shown.join(',') + ')';
        }).join('');
    }

    function cloneMatrix(matrix) {
        return matrix.map(col => col.slice());
    }

    function isBLMExpandable(matrix) {
        return Array.isArray(matrix) &&
            matrix.length > 0 &&
            matrix[matrix.length - 1] &&
            matrix[matrix.length - 1][0] > 0;
    }

    /**
     * 下面是你给的 BLM 核心 expand 逻辑，改成纯函数版。
     */
    function blmExpandCore(inputMatrix, fsTerm) {
        const b = cloneMatrix(normalizeMatrix(inputMatrix));

        let d3 = b.length - 1;
        const d2 = b[0].length - 1;

        const b2 = Array(d3 + 1).fill().map(() => Array(d2 + 1).fill(0));
        const c = Array(d2 + 1).fill(0);
        const c2 = Array(d3 + 1).fill(0);
        const c3 = Array(d2 + 1).fill(0);

        let d7 = 0;
        let d8 = 0;
        let d9 = 0;
        let d18 = 0;
        let d19 = 0;

        for (let d4 = 0; d4 <= d2; ++d4) {
            if (0 < b[d3][d4] && !b[d3][d4 + 1]) {
                for (let d5 = 0; d5 <= d3; ++d5) {
                    for (let d6 = 0; d6 <= d4; ++d6) {
                        if (b[d3 - d5][d6] < b[d3][d6] - c[d6]) {
                            if (d6 < d4) {
                                c[d6] = b[d3][d6] - b[d3 - d5][d6];
                            } else {
                                if (!d7) d8 = d5;

                                ++d9;

                                if (c[d4] + 1 < b[d3][d6] - b[d3 - d5][d6]) {
                                    ++c[d4];
                                }

                                c2[d9] = d5;

                                for (let d10 = 0; d10 <= d4; ++d10) {
                                    b2[d3 - d5][d10] = d9;
                                }

                                for (let d11 = 0; d11 <= d4; ++d11) {
                                    for (let d12 = d3 - d5 + 1; d12 <= d3; ++d12) {
                                        for (let d13 = d12; d13 >= d3 - d5; --d13) {
                                            for (let d14 = 0; d14 <= d11; ++d14) {
                                                if (b[d13][d14] < b[d12][d14] - c3[d14]) {
                                                    if (d11 === d14) {
                                                        if (0 < b2[d13][d11] && !b2[d12][d11]) {
                                                            b2[d12][d11] = d9;
                                                        }

                                                        d13 = d3 - d5;
                                                    } else {
                                                        c3[d14] = b[d12][d14] - b[d13][d14];
                                                    }
                                                } else {
                                                    d14 = d11;
                                                }
                                            }
                                        }

                                        for (let d15 = 0; d15 <= d4; ++d15) {
                                            c3[d15] = 0;
                                        }
                                    }
                                }

                                for (let d16 = 0; d16 <= d8; ++d16) {
                                    for (let d17 = 0; d17 <= d2; ++d17) {
                                        d18 = 0;

                                        if (0 < b2[d3 - d8 + d16][d17]) {
                                            if (d17 < d4 + 1) {
                                                d18 = b[d3 - c2[b2[d3 - d8 + d16][d17]]][d17] - b[d3 - d5][d17];
                                            }
                                        }

                                        if (
                                            b[d3 - d5 + d16][d17] < b[d3 - d8 + d16][d17] - d18 ||
                                            1 < d5 - d7 && 0 < d7
                                        ) {
                                            d16 = d7;
                                            d17 = d2;
                                            d19 = 1;
                                            d5 = d3;
                                            --d9;
                                        } else if (b[d3 - d8 + d16][d17] - d18 < b[d3 - d5 + d16][d17]) {
                                            d16 = d7;
                                            d17 = d2;
                                        }
                                    }
                                }

                                if (!d19) {
                                    d7 = d5;
                                } else {
                                    d19 = 0;
                                }
                            }
                        } else {
                            d6 = d4;
                        }
                    }
                }

                d4 = d2;
            }
        }

        for (let d20 = 0; d20 <= d2; ++d20) {
            if (0 < b[d3][d20 + 1]) {
                c[d20] = b[d3][d20] - b[d3 - d7][d20];
            } else {
                c[d20] = b[d3][d20] - b[d3 - d7][d20] - 1;
                d20 = d2;
            }
        }

        let result = b.slice(0, d3).map(col => col.slice());

        for (let d21 = 1; d21 <= fsTerm * d7; ++d21) {
            if (!result[d3]) result[d3] = [];
            if (!b2[d3]) b2[d3] = [];

            for (let d22 = 0; d22 <= d2; ++d22) {
                if (0 < b2[d3 - d7][d22] && b2[d3 - d7][d22] < d9 + 1) {
                    result[d3][d22] = result[d3 - d7][d22] + c[d22];
                } else {
                    result[d3][d22] = result[d3 - d7][d22];
                }

                b2[d3][d22] = b2[d3 - d7][d22];
            }

            ++d3;
        }

        if (d2 > 0 && result.every(column => column[d2] === 0)) {
            result = result.map(column => column.slice(0, d2));
        }

        return normalizeMatrix(result);
    }

    const blmCache = new Map();

    function blmFS(matrix, fsTerm) {
        const normalized = normalizeMatrix(matrix);

        if (normalized.length === 0) return [];

        const key = matrixToString(normalized) + '|' + fsTerm;

        if (blmCache.has(key)) {
            return cloneMatrix(blmCache.get(key));
        }

        const result = blmExpandCore(normalized, fsTerm);

        blmCache.set(key, cloneMatrix(result));

        return result;
    }

    function makeBLMLimitItem(n) {
        return {
            type: 'blm-limit-item',
            n,
            expr: normalizeMatrix([
                [0],
                Array(n).fill(1)
            ])
        };
    }

    function isBLMLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'blm-limit-item';
    }

    function isBLMLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isBLMLimitItem(seq[0]);
    }

    function formatBLMLimitItem(item) {
        return matrixToString(item.expr);
    }

    function getGroupsByFS(seq, times) {
        const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : normalizeMatrix(seq);
        const groups = [];
    
        const goodMatrix = matrix.slice(0, Math.max(matrix.length - 1, 0));
        const goodCells = matrixToCells(goodMatrix);
    
        let prevLen = goodCells.length;
    
        for (let k = 1; k <= times; k++) {
            const currentMatrix = blmFS(matrix, k);
            const currentCells = matrixToCells(currentMatrix);
    
            const group = currentCells.slice(prevLen);
    
            groups.push(group);
            prevLen = currentCells.length;
        }
    
        return groups;
    }

    function getBLMBadColumn(inputMatrix) {
        const b = cloneMatrix(normalizeMatrix(inputMatrix));
    
        if (!isBLMExpandable(b)) return -1;
    
        let d3 = b.length - 1;
        const d2 = b[0].length - 1;
    
        const b2 = Array(d3 + 1).fill().map(() => Array(d2 + 1).fill(0));
        const c = Array(d2 + 1).fill(0);
        const c2 = Array(d3 + 1).fill(0);
        const c3 = Array(d2 + 1).fill(0);
    
        let d7 = 0;
        let d8 = 0;
        let d9 = 0;
        let d18 = 0;
        let d19 = 0;
    
        for (let d4 = 0; d4 <= d2; ++d4) {
            if (0 < b[d3][d4] && !b[d3][d4 + 1]) {
                for (let d5 = 0; d5 <= d3; ++d5) {
                    for (let d6 = 0; d6 <= d4; ++d6) {
                        if (b[d3 - d5][d6] < b[d3][d6] - c[d6]) {
                            if (d6 < d4) {
                                c[d6] = b[d3][d6] - b[d3 - d5][d6];
                            } else {
                                if (!d7) d8 = d5;
    
                                ++d9;
    
                                if (c[d4] + 1 < b[d3][d6] - b[d3 - d5][d6]) {
                                    ++c[d4];
                                }
    
                                c2[d9] = d5;
    
                                for (let d10 = 0; d10 <= d4; ++d10) {
                                    b2[d3 - d5][d10] = d9;
                                }
    
                                for (let d11 = 0; d11 <= d4; ++d11) {
                                    for (let d12 = d3 - d5 + 1; d12 <= d3; ++d12) {
                                        for (let d13 = d12; d13 >= d3 - d5; --d13) {
                                            for (let d14 = 0; d14 <= d11; ++d14) {
                                                if (b[d13][d14] < b[d12][d14] - c3[d14]) {
                                                    if (d11 === d14) {
                                                        if (0 < b2[d13][d11] && !b2[d12][d11]) {
                                                            b2[d12][d11] = d9;
                                                        }
    
                                                        d13 = d3 - d5;
                                                    } else {
                                                        c3[d14] = b[d12][d14] - b[d13][d14];
                                                    }
                                                } else {
                                                    d14 = d11;
                                                }
                                            }
                                        }
    
                                        for (let d15 = 0; d15 <= d4; ++d15) {
                                            c3[d15] = 0;
                                        }
                                    }
                                }
    
                                for (let d16 = 0; d16 <= d8; ++d16) {
                                    for (let d17 = 0; d17 <= d2; ++d17) {
                                        d18 = 0;
    
                                        if (0 < b2[d3 - d8 + d16][d17]) {
                                            if (d17 < d4 + 1) {
                                                d18 =
                                                    b[d3 - c2[b2[d3 - d8 + d16][d17]]][d17]
                                                    - b[d3 - d5][d17];
                                            }
                                        }
    
                                        if (
                                            b[d3 - d5 + d16][d17] < b[d3 - d8 + d16][d17] - d18 ||
                                            1 < d5 - d7 && 0 < d7
                                        ) {
                                            d16 = d7;
                                            d17 = d2;
                                            d19 = 1;
                                            d5 = d3;
                                            --d9;
                                        } else if (b[d3 - d8 + d16][d17] - d18 < b[d3 - d5 + d16][d17]) {
                                            d16 = d7;
                                            d17 = d2;
                                        }
                                    }
                                }
    
                                if (!d19) {
                                    d7 = d5;
                                } else {
                                    d19 = 0;
                                }
                            }
                        } else {
                            d6 = d4;
                        }
                    }
                }
    
                d4 = d2;
            }
        }
    
        if (d7 <= 0) return -1;
    
        return d3 - d7;
    }
    
    function findVisibleCellIndexInColumn(cells, col) {
        if (!cells || col === undefined || col < 0) return -1;
    
        return cells.findIndex(cell => cell && cell.col === col);
    }

    registerNotation({
        id: 'BLM',
        name: 'BLM(ddfg ver.)',
        placeholder: '例如：(0)(1,1,1)(2)',
        defaultTimes: 3,
        lexDesc: true,

        // BLM 内部 token 就是一整列，所以开启 compact 可以显示列标
        compactTokens: true,

        parse(input) {
            return parseBLM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
        
            if (isBLMLimitSeq(seq)) {
                return 'sup{' + seq.map(formatBLMLimitItem).join(',') + ',...}';
            }
        
            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }
        
            return matrixToString(seq);
        },
        
        formatToken(token) {
            if (isBLMLimitItem(token)) {
                return formatBLMLimitItem(token);
            }
        
            // cell token
            if (
                token &&
                typeof token === 'object' &&
                token.row !== undefined &&
                token.colHeight !== undefined
            ) {
                const isLast = token.row === token.colHeight - 1;
        
                if (token.row === 0) {
                    return '(' + token.v + (isLast ? ')' : '');
                }
        
                return String(token.v) + (isLast ? ')' : '');
            }
        
            return String(token);
        },
        
        separator(curr, next) {
            if (isBLMLimitItem(curr) || isBLMLimitItem(next)) {
                return ',';
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
            if (isBLMLimitItem(token)) return index;
        
            return token.col;
        },
        
        compareSeq(a, b) {
            if (isBLMLimitSeq(a) || isBLMLimitSeq(b)) {
                return 0;
            }
        
            const ma = isCellSeq(a) ? cellsToMatrix(a) : normalizeMatrix(a);
            const mb = isCellSeq(b) ? cellsToMatrix(b) : normalizeMatrix(b);
        
            return matrixCompare(ma, mb);
        },
        
        isSuccessor(seq) {
            if (!seq || seq.length === 0) return true;
            if (isBLMLimitSeq(seq)) return false;
        
            const matrix = isCellSeq(seq)
                ? cellsToMatrix(seq)
                : normalizeMatrix(seq);
        
            if (matrix.length === 0) return true;
        
            return matrix[matrix.length - 1][0] <= 0;
        },
        
        countStep(seq) {
            if (!seq || seq.length === 0) return seq;
        
            const expanded = this.expand(seq, 1);
        
            if (!expanded || !expanded.result) return seq;
        
            const result = expanded.result;
            const goodLength = expanded.goodLength ?? 0;
        
            if (goodLength >= result.length) return result;
        
            const first = result[goodLength];
        
            if (!first || first.col === undefined) {
                return result.slice(0, goodLength + 1);
            }
        
            const targetCol = first.col;
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
            const matrix = isCellSeq(seq)
                ? cellsToMatrix(seq)
                : normalizeMatrix(seq);
        
            if (matrix.length === 0) {
                return {
                    result: [],
                    goodLength: 0,
                    groups: [],
                    badRootIndex: -1
                };
            }
        
            // 后继 / 不可展开：删除末列
            if (!isBLMExpandable(matrix)) {
                const goodMatrix = matrix.slice(0, matrix.length - 1);
                const goodCells = matrixToCells(goodMatrix);
        
                return {
                    result: goodCells,
                    goodLength: goodCells.length,
                    groups: [],
                    badRootIndex: -1
                };
            }
        
            const resultMatrix = blmFS(matrix, times);
            const resultCells = matrixToCells(resultMatrix);

            const goodMatrix = matrix.slice(0, matrix.length - 1);
            const goodCells = matrixToCells(goodMatrix);

            const groups = getGroupsByFS(seq, times);

            const badRootCol = getBLMBadColumn(matrix);
            const badRootIndex = findVisibleCellIndexInColumn(resultCells, badRootCol);

            return {
                result: resultCells,
                goodLength: goodCells.length,
                groups,
                badRootIndex,
                badRootColIndex: badRootCol
            };
        },

        getBadRootIndex(seq) {
            try {
                if (!seq || seq.length === 0) return -1;
                if (isBLMLimitSeq(seq)) return -1;
        
                const matrix = isCellSeq(seq)
                    ? cellsToMatrix(seq)
                    : normalizeMatrix(seq);
        
                if (!isBLMExpandable(matrix)) return -1;
        
                const badCol = getBLMBadColumn(matrix);
                if (badCol < 0) return -1;
        
                const cells = isCellSeq(seq)
                    ? seq
                    : matrixToCells(matrix);
        
                return findVisibleCellIndexInColumn(cells, badCol);
            } catch {
                return -1;
            }
        },

        isBadRootToken(record, index) {
            if (!record || !record.result) return false;
        
            const cur = record.result[index];
            if (!cur) return false;
        
            // 优先用 expand 返回的坏根列
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

        limit: {
            initial() {
                return [
                    makeBLMLimitItem(2),
                    makeBLMLimitItem(3)
                ];
            },

            extend(seq) {
                const last = seq[seq.length - 1];

                const nextN = isBLMLimitItem(last)
                    ? last.n + 1
                    : seq.length + 2;

                return [
                    ...seq,
                    makeBLMLimitItem(nextN)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isBLMLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();