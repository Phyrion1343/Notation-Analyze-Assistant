/* ============================================================
   nfBSM / not force Bashicu Sudden Matrix
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

        let rows = 1;
        matrix.forEach(col => {
            rows = Math.max(rows, col.length);
        });

        const normalized = matrix.map(col => {
            const next = [...col];
            while (next.length < rows) next.push(0);
            return next;
        });

        const cells = [];

        for (let c = 0; c < normalized.length; c++) {
            let lastSig = 0;

            for (let r = rows - 1; r >= 0; r--) {
                if (normalized[c][r] !== 0) {
                    lastSig = r;
                    break;
                }
            }

            const colHeight = lastSig + 1;

            for (let r = 0; r <= lastSig; r++) {
                cells.push({
                    v: normalized[c][r],
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

    function parseNfBSM(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效格式，例如：(0)(1,1)(2,1) 或 0,(1,1),(2,1)');
        }

        const rows = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] === '(') {
                const j = t.indexOf(')', i + 1);

                if (j === -1) {
                    throw new Error('括号未闭合');
                }

                const content = t.slice(i + 1, j);

                if (content === '') {
                    rows.push([0]);
                } else {
                    const parts = content.split(',');

                    if (parts.some(p => !/^-?\d+$/.test(p))) {
                        throw new Error('矩阵中包含无效数字');
                    }

                    rows.push(parts.map(Number));
                }

                i = j + 1;

                if (t[i] === ',') i++;
            } else {
                let j = i;

                while (j < t.length && t[j] !== ',') {
                    if (t[j] === '(' || t[j] === ')') {
                        throw new Error('格式错误');
                    }
                    j++;
                }

                const numStr = t.slice(i, j);

                if (!/^-?\d+$/.test(numStr)) {
                    throw new Error('矩阵中包含无效数字');
                }

                rows.push([Number(numStr)]);

                i = j;
                if (t[i] === ',') i++;
            }
        }

        if (rows.length === 0) {
            throw new Error('矩阵不能为空');
        }

        return columnsToCells(rows);
    }

    class SuddenMatrix {
        constructor(matrix) {
            this.matrix = matrix.map(row => [...row]);
            this.dim = Math.max(1, ...this.matrix.map(row => row.length));
            this.n = this.matrix.length;

            for (const row of this.matrix) {
                while (row.length < this.dim) {
                    row.push(0);
                }
            }

            const lastRow = this.matrix[this.n - 1];
            const nonZeroIndices = lastRow
                .map((val, idx) => val !== 0 ? idx : -1)
                .filter(idx => idx !== -1);

            this.LNZ = nonZeroIndices.length > 0
                ? nonZeroIndices[nonZeroIndices.length - 1]
                : null;
        }

        parent(x, y) {
            if (x < 0) return -1;

            if (y === 0) {
                for (let i = x - 1; i >= 0; i--) {
                    if (this.matrix[i][y] < this.matrix[x][y]) {
                        return i;
                    }
                }

                return -1;
            }

            let p = this.parent(x, y - 1);

            while (p >= 0 && this.matrix[p][y] >= this.matrix[x][y]) {
                p = this.parent(p, y - 1);
            }

            return p;
        }

        ancestor(p, x, y) {
            if (p >= x) return false;
        
            const px = this.parent(x, y);
        
            if (px === p) return true;
        
            if (px < 0) return false;
        
            return this.ancestor(p, px, y);
        }

        possible_roots() {
            if (this.LNZ === null) return [];

            const roots = [];

            for (let p = 0; p < this.n - 1; p++) {
                const parentP = this.parent(p, this.LNZ);
                const parentLast = this.parent(this.n - 1, this.LNZ);

                const condition1 = this.ancestor(parentP, parentLast, this.LNZ);
                const condition2 = this.LNZ === 0 || this.ancestor(p, this.n - 1, this.LNZ - 1);

                if (condition1 && condition2) {
                    roots.push(p);
                }
            }

            return roots;
        }

        ascension(r, x, y) {
            const R = this.possible_roots();

            for (const k of R) {
                if ((r <= k && this.ancestor(k, x, y)) || k === x) {
                    return 1;
                }
            }

            return 0;
        }

        delta(r, y) {
            if (y < this.LNZ) {
                return this.matrix[this.n - 1][y] - this.matrix[r][y];
            }

            if (y === this.LNZ) {
                return this.matrix[this.n - 1][y] - this.matrix[r][y] - 1;
            }

            return 0;
        }

        bigger_than(otherMatrix) {
            if (otherMatrix.dim < this.dim) return true;
            if (otherMatrix.dim > this.dim) return false;

            const minN = Math.min(this.n, otherMatrix.n);
            const minDim = Math.min(this.dim, otherMatrix.dim);

            for (let i = 0; i < minN; i++) {
                for (let j = 0; j < minDim; j++) {
                    if (otherMatrix.matrix[i][j] < this.matrix[i][j]) return true;
                    if (otherMatrix.matrix[i][j] > this.matrix[i][j]) return false;
                }
            }

            if (otherMatrix.n < this.n) return true;
            if (otherMatrix.n > this.n) return false;

            return false;
        }
    }

    class NfBSM {
        expand(matrix, times = 3, preExpand = false, root = null) {
            if (preExpand) {
                const expandedMatrix = this.expand(matrix, 1, false, root);

                const lastVec = [];

                for (let i = 0; i < matrix.dim; i++) {
                    lastVec.push(matrix.matrix[matrix.n - 1][i] + matrix.delta(root, i));
                }

                const newMatrix = expandedMatrix.matrix.matrix.map(row => [...row]);
                newMatrix.push(lastVec);

                return {
                    matrix: new SuddenMatrix(newMatrix),
                    coloredRows: expandedMatrix.coloredRows,
                    expansionRoot: expandedMatrix.expansionRoot
                };
            }

            if (root !== null) {
                const expandedMatrix = matrix.matrix.slice(0, -1).map(row => [...row]);
                const coloredRows = [];

                for (let i = 0; i < matrix.n - 1; i++) {
                    coloredRows.push('good');
                }

                for (let i = 0; i < times; i++) {
                    for (let x = root; x < matrix.n - 1; x++) {
                        const vec = [];

                        for (let j = 0; j < matrix.dim; j++) {
                            vec.push(
                                matrix.matrix[x][j]
                                + matrix.delta(root, j) * (i + 1) * matrix.ascension(root, x, j)
                            );
                        }

                        expandedMatrix.push(vec);
                        coloredRows.push(i % 2 === 0 ? 'even' : 'odd');
                    }
                }

                return {
                    matrix: new SuddenMatrix(expandedMatrix),
                    coloredRows,
                    expansionRoot: root
                };
            }

            const R = matrix.possible_roots();

            if (R.length === 0) {
                return {
                    matrix: new SuddenMatrix(matrix.matrix.map(row => [...row])),
                    coloredRows: [],
                    expansionRoot: null
                };
            }

            const exitPoints = [];
            const lastRootExpanded = this.expand(matrix, 1, true, R[R.length - 1]);

            for (const r of R.slice(0, -1)) {
                const currentExpanded = this.expand(matrix, 1, true, r);

                if (lastRootExpanded.matrix.bigger_than(currentExpanded.matrix)) {
                    exitPoints.push(r);
                }
            }

            const exitPoint = exitPoints.length > 0
                ? exitPoints[exitPoints.length - 1]
                : -1;

            let bestRoot = R[R.length - 1];

            for (const x of R.slice(0, -1)) {
                if (x > exitPoint) {
                    const newMatrix = this.expand(matrix, 1, true, x);
                    const bestMatrix = this.expand(matrix, 1, true, bestRoot);

                    if (newMatrix.matrix.bigger_than(bestMatrix.matrix)) {
                        bestRoot = x;
                    }
                }
            }

            return this.expand(matrix, times, false, bestRoot);
        }
    }

    function expandNfBSMMatrix(matrix, times) {
        const cols = matrix.length;

        if (cols === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }

        const lastCol = matrix[cols - 1];

        if (lastCol.every(v => v === 0)) {
            const goodMatrix = matrix.slice(0, cols - 1);
            const goodCells = matrixToCells(goodMatrix);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1
            };
        }

        const sm = new SuddenMatrix(matrix);
        const nfbsm = new NfBSM();
        const expansion = nfbsm.expand(sm, times);

        const expandedRows = expansion.matrix.matrix;
        const resultCells = matrixToCells(expandedRows);

        const goodRows = expandedRows.slice(0, Math.max(sm.n - 1, 0));
        const goodCells = matrixToCells(goodRows);

        const root = expansion.expansionRoot;

        let groups = [];

        if (root !== null && root !== undefined) {
            const blockLen = Math.max(0, sm.n - 1 - root);
            let startRow = sm.n - 1;

            for (let i = 0; i < times; i++) {
                const segRows = expandedRows.slice(startRow, startRow + blockLen);
                groups.push(matrixToCells(segRows));
                startRow += blockLen;
            }
        }

        const badRootIndex = root === null || root === undefined
            ? -1
            : resultCells.findIndex(cell => cell.col === root);

        return {
            result: resultCells,
            goodLength: goodCells.length,
            groups,
            badRootIndex,
            badRootColIndex: root
        };
    }

    function makeNfBSMLimitItem(n) {
        return {
            type: 'nfbsm-limit-item',
            n,
            expr: columnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }

    function isNfBSMLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'nfbsm-limit-item';
    }

    function isNfBSMLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isNfBSMLimitItem(seq[0]);
    }

    function formatNfBSMLimitItem(item) {
        return cellsToString(item.expr);
    }

    registerNotation({
        id: 'nfBSM',
        name: 'nfBSM',
        placeholder: '例如：(0)(1,1)(2,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseNfBSM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';

            if (isNfBSMLimitSeq(seq)) {
                return 'sup{' + seq.map(formatNfBSMLimitItem).join(',') + ',...}';
            }

            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }

            return cellsToString(matrixToCells(seq));
        },

        formatToken(token) {
            if (isNfBSMLimitItem(token)) {
                return formatNfBSMLimitItem(token);
            }

            const isLast = token.row === token.colHeight - 1;

            if (token.row === 0) {
                return '(' + token.v + (isLast ? ')' : '');
            }

            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            if (isNfBSMLimitItem(curr) || isNfBSMLimitItem(next)) {
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
            if (isNfBSMLimitItem(token)) return index;
            return token.col;
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;

                if (!matrix || matrix.length === 0) return -1;
                if (matrix[matrix.length - 1].every(v => v === 0)) return -1;

                const sm = new SuddenMatrix(matrix);
                const nfbsm = new NfBSM();
                const expansion = nfbsm.expand(sm, 1);

                const root = expansion.expansionRoot;

                if (root === null || root === undefined || root < 0) return -1;

                const cells = isCellSeq(seq) ? seq : matrixToCells(matrix);

                return cells.findIndex(cell => cell.col === root);
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

            if (!bad || bad.col === undefined) {
                return [badIndex];
            }

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

        expand(seq, times) {
            const matrix = isCellSeq(seq) ? cellsToMatrix(seq) : seq;
            return expandNfBSMMatrix(matrix, times);
        },

        limit: {
            initial() {
                return [
                    makeNfBSMLimitItem(1),
                    makeNfBSMLimitItem(2),
                    makeNfBSMLimitItem(3)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    makeNfBSMLimitItem(seq.length + 1)
                ];
            },

            select(seq, index) {
                const item = seq[index];

                if (!isNfBSMLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();