/* ============================================================
   CMS / Crane Matrix System
============================================================ */

(function() {
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

        let rows = 0;
        for (const col of matrix) {
            rows = Math.max(rows, col.length);
        }

        const cells = [];

        for (let c = 0; c < matrix.length; c++) {
            const col = matrix[c] || [];

            let lastSig = 0;

            for (let r = rows - 1; r >= 0; r--) {
                if ((col[r] || 0) !== 0) {
                    lastSig = r;
                    break;
                }
            }

            const colHeight = lastSig + 1;

            for (let r = 0; r <= lastSig; r++) {
                cells.push({
                    v: col[r] || 0,
                    col: c,
                    row: r,
                    colHeight
                });
            }
        }

        return cells;
    }

    function normalizeMatrix(matrix) {
        if (!matrix || matrix.length === 0) return [];

        let rows = 0;
        for (const col of matrix) {
            rows = Math.max(rows, col.length);
        }

        return matrix.map(col => {
            const next = [...col];
            while (next.length < rows) next.push(0);
            return next;
        });
    }

    function trimMatrixRows(matrix) {
        if (!matrix || matrix.length === 0) return [];

        let rows = 0;
        for (const col of matrix) {
            rows = Math.max(rows, col.length);
        }

        let lastRow = 0;

        for (let r = rows - 1; r >= 0; r--) {
            let nonzero = false;

            for (const col of matrix) {
                if ((col[r] || 0) !== 0) {
                    nonzero = true;
                    break;
                }
            }

            if (nonzero) {
                lastRow = r;
                break;
            }
        }

        return matrix.map(col => {
            const next = [];
            for (let r = 0; r <= lastRow; r++) {
                next.push(col[r] || 0);
            }
            return next;
        });
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

    function parseCMS(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)');
            }

            const j = t.indexOf(')', i + 1);

            if (j === -1) {
                throw new Error('请输入有效的矩阵格式，例如：(0)(1,1,1)');
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

    function compareMatrixCMS(a, b) {
        const ma = normalizeMatrix(a);
        const mb = normalizeMatrix(b);

        const maxCols = Math.max(ma.length, mb.length);

        for (let c = 0; c < maxCols; c++) {
            const ca = ma[c] || [];
            const cb = mb[c] || [];
            const maxRows = Math.max(ca.length, cb.length);

            for (let r = 0; r < maxRows; r++) {
                const va = ca[r] || 0;
                const vb = cb[r] || 0;

                if (va < vb) return -1;
                if (va > vb) return 1;
            }
        }

        return 0;
    }

    function findCMSBadRootCol(matrix) {
        const m1 = normalizeMatrix(matrix);

        if (!m1 || m1.length === 0) return -1;

        const endcol = m1.length - 1;
        const child = m1[endcol];

        let LNZ = child.length - 1;
        while (LNZ >= 0 && !child[LNZ]) LNZ--;

        if (LNZ < 0) return -1;

        const m1cache = {};

        function parent(m, cache, x, y) {
            const str = x + ',' + y;

            if (cache[str] !== undefined) return cache[str];

            let p = x;

            while (true) {
                p = y ? parent(m, cache, p, y - 1) : p - 1;

                if (p < 0) break;
                if ((m[p][y] || 0) < (m[x][y] || 0)) break;
            }

            cache[str] = p;
            return p;
        }

        return parent(m1, m1cache, endcol, LNZ);
    }

    function expandCMSMatrix(matrix, FSterm) {
        let m1 = normalizeMatrix(matrix);

        if (m1.length === 0) return [];

        const endcol = m1.length - 1;
        let m2 = m1.slice(0, endcol).map(col => [...col]);
        const child = m1[endcol];
        const ymax = child.length - 1;

        const m1cache = {};
        const m2cache = {};
        const ascendingCache = {};

        function parent(m, cache, x, y) {
            const str = x + ',' + y;

            if (cache[str] !== undefined) return cache[str];

            let p = x;

            while (true) {
                p = y ? parent(m, cache, p, y - 1) : p - 1;

                if (p < 0) break;
                if ((m[p][y] || 0) < (m[x][y] || 0)) break;
            }

            cache[str] = p;
            return p;
        }

        function L(m, cache, x1, x2) {
            for (let y = ymax; y >= 0; --y) {
                if (!(m[x2][y] || 0)) continue;

                let x = x2;
                while (x1 < x) {
                    x = parent(m, cache, x, y);
                }

                if (x === x1) return y;
            }

            return -1;
        }

        function ascending(r, x, y) {
            const str = r + ',' + x + ',' + y;

            if (ascendingCache[str] !== undefined) {
                return ascendingCache[str];
            }

            if (x < 0) {
                ascendingCache[str] = false;
                return false;
            }

            const res = r <= x && (
                r === x ||
                ascending(r, parent(m1, m1cache, x, y), y)
            );

            ascendingCache[str] = res;
            return res;
        }

        let LNZ = ymax;

        while (LNZ >= 0) {
            if ((child[LNZ] || 0) > 0) break;
            --LNZ;
        }

        if (LNZ < 0 || !FSterm) {
            return trimMatrixRows(m2);
        }

        const BR = parent(m1, m1cache, endcol, LNZ);
        const BRcolumn = m1[BR];

        const offset = child.map((value, y) => {
            return y < LNZ ? value - (BRcolumn[y] || 0) : 0;
        });

        const offsetAsc = Array(endcol)
            .fill(0, BR)
            .map((_, x) => {
                return offset.map((value, y) => {
                    return ascending(BR, x, y) ? value : 0;
                });
            });

        for (let n = 1; n <= FSterm; n++) {
            for (let col = BR; col < endcol; col++) {
                m2.push(
                    m1[col].map((value, y) => {
                        return value + offsetAsc[col][y] * n;
                    })
                );
            }
        }

        let col;

        for (col = endcol; BR < --col;) {
            if (L(m1, m1cache, BR, col) > LNZ) break;
        }

        if (col === BR) {
            if (ymax > 0 && m2.every(column => (column[ymax] || 0) === 0)) {
                m2 = m2.map(column => column.slice(0, ymax));
            }

            return trimMatrixRows(m2);
        }

        m2.push(
            child.map((value, y) => {
                return value + (y <= LNZ ? value - (BRcolumn[y] || 0) : 0) * FSterm;
            })
        );

        const c = col;
        const c_ = c + (endcol - BR);
        const d = m2.length - 1;
        const D = [];

        for (col = endcol; col < d; ++col) {
            D.push(
                m2[col].map((value, k) => {
                    if (k > LNZ) return value;

                    let u = 0;
                    let ss = col;
                    let nextss;

                    while (true) {
                        nextss = parent(m2, m2cache, ss, k);

                        if (nextss < endcol) break;

                        ++u;
                        ss = nextss;
                    }

                    if (L(m2, m2cache, ss, d) >= k - 1) {
                        return (m2[c_][k] || 0) + u;
                    }

                    return value;
                })
            );
        }

        m2 = m2.slice(0, c_).concat(D);

        if (ymax > 0 && m2.every(column => (column[ymax] || 0) === 0)) {
            m2 = m2.map(column => column.slice(0, ymax));
        }

        return trimMatrixRows(m2);
    }

    function expandCMS(matrix, times) {
        const m = normalizeMatrix(matrix);

        if (m.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1
            };
        }

        const lastColIdx = m.length - 1;

        // 后继序数：末列全 0，直接删除末列
        if (m[lastColIdx].every(v => v === 0)) {
            const goodMatrix = m.slice(0, lastColIdx);
            const goodCells = matrixToCells(goodMatrix);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1
            };
        }

        const badCol = findCMSBadRootCol(m);

        const goodMatrix = expandCMSMatrix(m, 0);
        const goodCells = matrixToCells(goodMatrix);

        const finalMatrix = expandCMSMatrix(m, times);
        const resultCells = matrixToCells(finalMatrix);

        const groups = [];
        let prevLen = goodCells.length;

        for (let k = 1; k <= times; k++) {
            const km = expandCMSMatrix(m, k);
            const kc = matrixToCells(km);

            groups.push(kc.slice(prevLen));
            prevLen = kc.length;
        }

        let badRootIndex = -1;

        if (badCol >= 0) {
            badRootIndex = resultCells.findIndex(cell => cell.col === badCol);
        }

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: badCol
        };
    }

    function makeCMSLimitItem(n) {
        return {
            type: 'cms-limit-item',
            n,
            expr: columnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }

    function isCMSLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'cms-limit-item';
    }

    function isCMSLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isCMSLimitItem(seq[0]);
    }

    function formatCMSLimitItem(item) {
        return '(0)(' + Array(item.n).fill(1).join(',') + ')';
    }

    registerNotation({
        id: 'CMS',
        name: 'CMS',
        placeholder: '例如：(0)(1,1,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseCMS(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isCMSLimitSeq(seq)) {
                return 'sup{' + seq.map(formatCMSLimitItem).join(',') + ',...}';
            }

            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }

            return cellsToString(matrixToCells(seq));
        },

        formatToken(token) {
            if (isCMSLimitItem(token)) {
                return formatCMSLimitItem(token);
            }

            const isLast = token.row === token.colHeight - 1;

            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }

            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (isCMSLimitItem(curr) || isCMSLimitItem(next)) {
                return ',';
            }

            // 跨列不加分隔符
            if (
                curr &&
                next &&
                curr.row !== undefined &&
                next.row !== undefined &&
                next.row === 0
            ) {
                return '';
            }

            // 同列内部逗号
            return ',';
        },

        getTokenGroupKey(token, index) {
            if (isCMSLimitItem(token)) return index;
            return token.col;
        },

        compareSeq(a, b) {
            const ma = isCellSeq(a) ? cellsToMatrix(a) : a;
            const mb = isCellSeq(b) ? cellsToMatrix(b) : b;

            return compareMatrixCMS(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;

                if (!matrix || matrix.length === 0) return -1;

                const m = normalizeMatrix(matrix);
                const lastCol = m[m.length - 1];

                if (lastCol.every(v => v === 0)) return -1;

                const badCol = findCMSBadRootCol(m);
                if (badCol < 0) return -1;

                const cells = isCellSeq(seq) ? seq : matrixToCells(m);

                return cells.findIndex(cell => cell.col === badCol);
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
            const m = normalizeMatrix(matrix);

            if (!m || m.length === 0) return true;

            const lastCol = m[m.length - 1];

            return lastCol.every(v => v === 0);
        },

        countStep(seq) {
            const expanded = this.expand(seq, 1);

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
            return expandCMS(matrix, times);
        },

        limit: {
            initial() {
                return [
                    makeCMSLimitItem(1),
                    makeCMSLimitItem(2),
                    makeCMSLimitItem(3)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    makeCMSLimitItem(seq.length + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isCMSLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();