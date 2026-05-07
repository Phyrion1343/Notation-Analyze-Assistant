/* ============================================================
   BHM / Bashicu Hyper Matrix
============================================================ */

(function() {
    function isBHMCellSeq(seq) {
        return Array.isArray(seq)
            && seq.length > 0
            && typeof seq[0] === 'object'
            && seq[0] !== null
            && 'v' in seq[0]
            && 'col' in seq[0]
            && 'row' in seq[0];
    }

    function trimBHMColumn(col) {
        if (!col || col.length === 0) return [0];

        const a = [...col];

        while (a.length > 1 && a[a.length - 1] === 0) {
            a.pop();
        }

        return a;
    }

    function normalizeBHMMatrix(matrix) {
        if (!matrix || matrix.length === 0) return [];

        let maxRows = 0;
        matrix.forEach(col => {
            maxRows = Math.max(maxRows, col.length);
        });

        return matrix.map(col => {
            const a = [...col];
            while (a.length < maxRows) a.push(0);
            return a;
        });
    }

    function bhmColumnsToCells(columns) {
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

    function bhmCellsToMatrix(cells) {
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

    function bhmMatrixToCells(matrix) {
        if (!matrix || matrix.length === 0) return [];

        const m = normalizeBHMMatrix(matrix);
        if (m.length === 0) return [];

        const rows = m[0].length;
        const cells = [];

        for (let c = 0; c < m.length; c++) {
            let lastSig = 0;

            for (let r = rows - 1; r >= 0; r--) {
                if (m[c][r] !== 0) {
                    lastSig = r;
                    break;
                }
            }

            const colHeight = lastSig + 1;

            for (let r = 0; r <= lastSig; r++) {
                cells.push({
                    v: m[c][r],
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return cells;
    }

    function bhmCellsToString(cells) {
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

    function bhmMatrixToString(matrix) {
        return bhmCellsToString(bhmMatrixToCells(matrix));
    }

    function compareBHMMatrix(a, b) {
        const ma = normalizeBHMMatrix(a || []);
        const mb = normalizeBHMMatrix(b || []);

        const maxCols = Math.max(ma.length, mb.length);

        for (let c = 0; c < maxCols; c++) {
            const colA = trimBHMColumn(ma[c] || []);
            const colB = trimBHMColumn(mb[c] || []);
            const maxRows = Math.max(colA.length, colB.length);

            for (let r = 0; r < maxRows; r++) {
                const va = r < colA.length ? colA[r] : 0;
                const vb = r < colB.length ? colB[r] : 0;

                if (va < vb) return -1;
                if (va > vb) return 1;
            }
        }

        return 0;
    }

    function parseBHM(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,1)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,1)');
            }

            const j = t.indexOf(')', i + 1);

            if (j === -1) {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,1)');
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

        return bhmColumnsToCells(columns);
    }

    function findVisibleBHMCellIndex(cells, badCol, badRow) {
        if (!cells || badCol === undefined || badCol < 0) return -1;

        let idx = cells.findIndex(
            cell => cell.col === badCol && cell.row === badRow
        );

        if (idx >= 0) return idx;

        idx = cells.findIndex(cell => cell.col === badCol);

        return idx;
    }

    function computeBHMExpansion(matrix, FSterm) {
        const m = normalizeBHMMatrix(matrix);

        if (!m || m.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1,
                badRootRowIndex: 0
            };
        }

        const endcol = m.length - 1;
        const resultBase = m.slice(0, endcol);
        const child = m[endcol];
        const ymax = child.length - 1;

        let LNZ;
        for (LNZ = ymax; LNZ >= 0; --LNZ) {
            if (child[LNZ] > 0) break;
        }

        // 后继序数：末列全 0，直接删除末列
        if (LNZ < 0) {
            const goodCells = bhmMatrixToCells(resultBase);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1,
                badRootRowIndex: 0
            };
        }

        const parent_cache = {};
        const ascending_cache = {};
        let roots = [];

        function parent(x, y) {
            const str = x + ',' + y;

            if (parent_cache[str] !== undefined) {
                return parent_cache[str];
            }

            let p = x;

            for (;;) {
                p = y ? parent(p, y - 1) : p - 1;

                if (p < 0) break;
                if (m[p][y] < m[x][y]) break;
            }

            parent_cache[str] = p;
            return p;
        }

        function ascending(r, x, y) {
            const str = r + ',' + x + ',' + y;

            if (ascending_cache[str] !== undefined) {
                return ascending_cache[str];
            }

            const val = r <= x && (
                roots.includes(x) ||
                ascending(r, parent(x, y), y)
            );

            ascending_cache[str] = val;
            return val;
        }

        function delta(r) {
            return m[r].map((value, y) => {
                return y < LNZ ? child[y] - value : 0;
            });
        }

        function expansion(r, n) {
            const ss = m.slice(0, endcol).map(col => [...col]);
            const delr = delta(r);

            for (let a = 1; a <= n; ++a) {
                for (let x = r; x < endcol; ++x) {
                    ss.push(
                        ss[x].map((value, y) => {
                            return value + a * delr[y] * (ascending(r, x, y) ? 1 : 0);
                        })
                    );
                }
            }

            return ss;
        }

        function expansionappend(r) {
            const delr = delta(r);
            const res = expansion(r, 1);

            res.push(
                m[endcol].map((value, y) => {
                    return value + delr[y] * (ascending(r, endcol, y) ? 1 : 0);
                })
            );

            return res;
        }

        const specialroot = parent(parent(endcol, LNZ), LNZ);

        for (let n = endcol; ;) {
            n = LNZ ? parent(n, LNZ - 1) : n - 1;

            if (n <= specialroot) break;

            if (parent(n, LNZ) === specialroot) {
                roots.push(n);
            }
        }

        if (roots.length === 0) {
            const baseCells = bhmMatrixToCells(resultBase);

            return {
                result: baseCells,
                goodLength: baseCells.length,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1,
                badRootRowIndex: 0
            };
        }

        const threshould = expansionappend(roots[0]);

        let n = roots.findIndex(r => {
            return compareBHMMatrix(expansionappend(r), threshould) < 0;
        });

        if (n === -1) n = roots.length;

        const badRootCol = roots[n - 1];
        const badRootRow = 0;

        let finalMatrix = expansion(badRootCol, FSterm);

        // 原代码逻辑：
        // if(ymax>0 && result.every(column=>column[ymax]===0))
        //     result = result.map(column=>column.slice(0,ymax))
        let trimmedTopRow = false;

        if (ymax > 0 && finalMatrix.every(column => column[ymax] === 0)) {
            trimmedTopRow = true;
            finalMatrix = finalMatrix.map(column => column.slice(0, ymax));
        }

        let goodMatrix = resultBase.map(col => [...col]);

        if (trimmedTopRow) {
            goodMatrix = goodMatrix.map(column => column.slice(0, ymax));
        }

        const resultCells = bhmMatrixToCells(finalMatrix);
        const goodCells = bhmMatrixToCells(goodMatrix);

        // groups 按每一轮展开分组，用于蓝绿交替
        const groups = [];
        let prevLen = goodCells.length;

        for (let k = 1; k <= FSterm; k++) {
            let km = expansion(badRootCol, k);

            if (trimmedTopRow) {
                km = km.map(column => column.slice(0, ymax));
            }

            const kc = bhmMatrixToCells(km);
            groups.push(kc.slice(prevLen));
            prevLen = kc.length;
        }

        const badRootIndex = findVisibleBHMCellIndex(
            resultCells,
            badRootCol,
            badRootRow
        );

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: badRootCol,
            badRootRowIndex: badRootRow
        };
    }

    function makeBHMLimitItem(n) {
        return {
            type: 'bhm-limit-item',
            n,
            expr: bhmColumnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }

    function isBHMLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'bhm-limit-item';
    }

    function isBHMLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isBHMLimitItem(seq[0]);
    }

    function formatBHMLimitItem(item) {
        return bhmCellsToString(item.expr);
    }

    registerNotation({
        id: 'BHM',
        name: 'BHM',
        placeholder: '例如：(0)(1,1)(2,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseBHM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isBHMLimitSeq(seq)) {
                return 'sup{' + seq.map(formatBHMLimitItem).join(',') + ',...}';
            }

            if (isBHMCellSeq(seq)) {
                return bhmCellsToString(seq);
            }

            return bhmMatrixToString(seq);
        },

        formatToken(token) {
            if (isBHMLimitItem(token)) {
                return formatBHMLimitItem(token);
            }

            const isLast = token.row === token.colHeight - 1;

            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }

            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (isBHMLimitItem(curr) || isBHMLimitItem(next)) {
                return ',';
            }

            // 跨列不加分隔符：(0)(1,1)
            if (
                curr &&
                next &&
                curr.row !== undefined &&
                next.row !== undefined &&
                next.row === 0
            ) {
                return '';
            }

            // 同列内加逗号：(1,1)
            return ',';
        },

        getTokenGroupKey(token, index) {
            if (isBHMLimitItem(token)) return index;
            return token.col;
        },

        compareSeq(a, b) {
            const ma = isBHMCellSeq(a) ? bhmCellsToMatrix(a) : a;
            const mb = isBHMCellSeq(b) ? bhmCellsToMatrix(b) : b;

            return compareBHMMatrix(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isBHMCellSeq(seq) ? bhmCellsToMatrix(seq) : seq;
                const expanded = computeBHMExpansion(matrix, 1);

                if (
                    expanded.badRootColIndex === undefined ||
                    expanded.badRootColIndex < 0
                ) {
                    return -1;
                }

                const cells = isBHMCellSeq(seq) ? seq : bhmMatrixToCells(matrix);

                return findVisibleBHMCellIndex(
                    cells,
                    expanded.badRootColIndex,
                    expanded.badRootRowIndex ?? 0
                );
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

            const matrix = isBHMCellSeq(seq) ? bhmCellsToMatrix(seq) : seq;
            const m = normalizeBHMMatrix(matrix);

            if (!m || m.length === 0) return true;

            const lastCol = m[m.length - 1];

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
            const matrix = isBHMCellSeq(seq) ? bhmCellsToMatrix(seq) : seq;
            return computeBHMExpansion(matrix, times);
        },

        limit: {
            initial() {
                return [
                    makeBHMLimitItem(1),
                    makeBHMLimitItem(2),
                    makeBHMLimitItem(3)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    makeBHMLimitItem(seq.length + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isBHMLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();