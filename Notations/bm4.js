/* ============================================================
   BMS / Bashicu Matrix
============================================================ */

(function() {
    function bmsIsCellSeq(seq) {
        return Array.isArray(seq)
            && seq.length > 0
            && typeof seq[0] === 'object'
            && seq[0] !== null
            && 'v' in seq[0]
            && 'col' in seq[0]
            && 'row' in seq[0];
    }

    function bmsColumnsToCells(columns) {
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

    function bmsCellsToMatrix(cells) {
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

    function bmsMatrixToCells(matrix) {
        if (!matrix || matrix.length === 0) return [];

        const rows = matrix[0].length;
        const cells = [];

        for (let c = 0; c < matrix.length; c++) {
            let lastSig = 0;

            for (let r = rows - 1; r >= 0; r--) {
                if ((matrix[c][r] || 0) !== 0) {
                    lastSig = r;
                    break;
                }
            }

            const colHeight = lastSig + 1;

            for (let r = 0; r <= lastSig; r++) {
                cells.push({
                    v: matrix[c][r] || 0,
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return cells;
    }

    function bmsNormalizeMatrix(matrix) {
        if (!matrix || matrix.length === 0) return [];

        let rows = 0;

        matrix.forEach(col => {
            rows = Math.max(rows, col.length);
        });

        return matrix.map(col => {
            const next = col.slice();
            while (next.length < rows) next.push(0);
            return next;
        });
    }

    function bmsTrimColumn(col) {
        const next = col.slice();

        while (next.length > 1 && next[next.length - 1] === 0) {
            next.pop();
        }

        return next;
    }

    function bmsCellsToString(cells) {
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

    function bmsParse(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,2)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,2)');
            }

            const j = t.indexOf(')', i + 1);

            if (j === -1) {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1)(2,2)');
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

        return bmsColumnsToCells(columns);
    }

    function bmsSequenceCompare(a, b) {
        const len = Math.max(a.length, b.length);

        for (let i = 0; i < len; i++) {
            const x = i < a.length ? a[i] : 0;
            const y = i < b.length ? b[i] : 0;

            if (x < y) return -1;
            if (x > y) return 1;
        }

        return 0;
    }

    function bmsMatrixCompare(m1, m2) {
        if (m1.length === 0) {
            return m2.length === 0 ? 0 : -1;
        }

        if (m2.length === 0) {
            return 1;
        }

        const col1 = bmsTrimColumn(m1[0] || []);
        const col2 = bmsTrimColumn(m2[0] || []);

        const cmp = bmsSequenceCompare(col1, col2);

        if (cmp) return cmp;

        return bmsMatrixCompare(m1.slice(1), m2.slice(1));
    }

    function bmsFindVisibleCellIndexInColumn(cells, col) {
        if (!cells || col === undefined || col < 0) return -1;
        return cells.findIndex(cell => cell.col === col);
    }

    function bmsCompute(matrixInput, times) {
        const m = bmsNormalizeMatrix(matrixInput);
        const endcol = m.length - 1;

        if (m.length === 0) {
            return {
                resultMatrix: [],
                goodMatrix: [],
                groupMatrices: [],
                badRootColIndex: -1
            };
        }

        const child = m[endcol];

        // 后继序数：末列全 0，直接删除末列
        if (child.every(v => v === 0)) {
            const goodMatrix = m.slice(0, endcol).map(col => col.slice());

            return {
                resultMatrix: goodMatrix,
                goodMatrix,
                groupMatrices: [],
                badRootColIndex: -1
            };
        }

        const parentCache = {};
        const ascendingCache = {};

        function val(x, y) {
            if (x < 0 || x >= m.length) return 0;
            return m[x][y] ?? 0;
        }

        function parent(x, y) {
            const key = x + ',' + y;

            if (parentCache[key] !== undefined) {
                return parentCache[key];
            }

            let p = x;

            while (true) {
                p = y ? parent(p, y - 1) : p - 1;

                if (p < 0) break;

                if (val(p, y) < val(x, y)) break;
            }

            parentCache[key] = p;
            return p;
        }

        function ascending(r, x, y) {
            const key = r + ',' + x + ',' + y;

            if (ascendingCache[key] !== undefined) {
                return ascendingCache[key];
            }

            const result = r <= x && (r === x || ascending(r, parent(x, y), y));

            ascendingCache[key] = result;
            return result;
        }

        const result = m.slice(0, endcol).map(col => col.slice());
        const goodMatrix = result.map(col => col.slice());

        const ymax = child.length - 1;

        let LNZ = ymax;

        for (; LNZ >= 0; --LNZ) {
            if ((child[LNZ] || 0) > 0) break;
        }

        if (LNZ < 0) {
            return {
                resultMatrix: result,
                goodMatrix,
                groupMatrices: [],
                badRootColIndex: -1
            };
        }

        const BR = parent(endcol, LNZ);
        const BRcolumn = m[BR];

        const offset = child.map((value, y) => {
            return y < LNZ ? value - (BRcolumn[y] ?? 0) : 0;
        });

        const offsetAsc = [];

        for (let x = BR; x < endcol; x++) {
            offsetAsc[x] = offset.map((value, y) => {
                return ascending(BR, x, y) ? value : 0;
            });
        }

        const groupMatrices = [];

        for (let n = 1; n <= times; n++) {
            const group = [];

            for (let col = BR; col < endcol; col++) {
                const newCol = m[col].map((value, y) => {
                    return value + (offsetAsc[col][y] || 0) * n;
                });

                result.push(newCol);
                group.push(newCol);
            }

            groupMatrices.push(group);
        }

        let shouldDropTopRow = false;

        if (ymax > 0 && result.every(column => (column[ymax] ?? 0) === 0)) {
            shouldDropTopRow = true;
        }

        function maybeDrop(col) {
            return shouldDropTopRow ? col.slice(0, ymax) : col.slice();
        }

        return {
            resultMatrix: result.map(maybeDrop),
            goodMatrix: goodMatrix.map(maybeDrop),
            groupMatrices: groupMatrices.map(group => group.map(maybeDrop)),
            badRootColIndex: BR
        };
    }

    function bmsExpandMatrix(matrix, times) {
        const computed = bmsCompute(matrix, times);

        const resultCells = bmsMatrixToCells(computed.resultMatrix);
        const goodCells = bmsMatrixToCells(computed.goodMatrix);
        const groups = computed.groupMatrices.map(group => bmsMatrixToCells(group));

        const badRootIndex = bmsFindVisibleCellIndexInColumn(
            resultCells,
            computed.badRootColIndex
        );

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: computed.badRootColIndex
        };
    }

    function bmsMakeLimitItem(n) {
        return {
            type: 'bms-limit-item',
            n,
            expr: bmsColumnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }

    function bmsIsLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'bms-limit-item';
    }

    function bmsIsLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            bmsIsLimitItem(seq[0]);
    }

    function bmsFormatLimitItem(item) {
        return bmsCellsToString(item.expr);
    }

    registerNotation({
        id: 'BMS',
        name: 'BM4',
        placeholder: '例如：(0)(1,1)(2,2)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return bmsParse(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (bmsIsLimitSeq(seq)) {
                return 'sup{' + seq.map(bmsFormatLimitItem).join(',') + ',...}';
            }

            if (bmsIsCellSeq(seq)) {
                return bmsCellsToString(seq);
            }

            return bmsCellsToString(bmsMatrixToCells(seq));
        },

        formatToken(token) {
            if (bmsIsLimitItem(token)) {
                return bmsFormatLimitItem(token);
            }

            const isLast = token.row === token.colHeight - 1;

            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }

            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (bmsIsLimitItem(curr) || bmsIsLimitItem(next)) {
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
            if (bmsIsLimitItem(token)) return index;
            return token.col;
        },

        compareSeq(a, b) {
            const ma = bmsIsCellSeq(a) ? bmsCellsToMatrix(a) : a;
            const mb = bmsIsCellSeq(b) ? bmsCellsToMatrix(b) : b;

            return bmsMatrixCompare(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = bmsIsCellSeq(seq) ? bmsCellsToMatrix(seq) : seq;
                const computed = bmsCompute(matrix, 1);

                if (
                    computed.badRootColIndex === undefined ||
                    computed.badRootColIndex === null ||
                    computed.badRootColIndex < 0
                ) {
                    return -1;
                }

                const cells = bmsIsCellSeq(seq) ? seq : bmsMatrixToCells(matrix);

                return bmsFindVisibleCellIndexInColumn(
                    cells,
                    computed.badRootColIndex
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

            const matrix = bmsIsCellSeq(seq) ? bmsCellsToMatrix(seq) : seq;
            if (!matrix || matrix.length === 0) return true;

            const normalized = bmsNormalizeMatrix(matrix);
            const lastCol = normalized[normalized.length - 1];

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
            const matrix = bmsIsCellSeq(seq) ? bmsCellsToMatrix(seq) : seq;
            return bmsExpandMatrix(matrix, times);
        },

        limit: {
            initial() {
                return [
                    bmsMakeLimitItem(1),
                    bmsMakeLimitItem(2),
                    bmsMakeLimitItem(3)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    bmsMakeLimitItem(seq.length + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!bmsIsLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();