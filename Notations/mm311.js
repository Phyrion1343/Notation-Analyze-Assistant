/* ============================================================
   MM3.1.1
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
            const rawCol = columns[c] || [];
            const col = rawCol.length === 0 ? [0] : rawCol;
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

    function cellsToColumns(cells) {
        if (!cells || cells.length === 0) return [];

        let maxCol = -1;

        cells.forEach(cell => {
            maxCol = Math.max(maxCol, cell.col);
        });

        const columns = Array.from({ length: maxCol + 1 }, () => []);

        cells.forEach(cell => {
            columns[cell.col][cell.row] = cell.v;
        });

        return columns.map(col => {
            if (!col || col.length === 0) return [0];

            let last = col.length - 1;
            while (last > 0 && (col[last] ?? 0) === 0) last--;

            const out = [];
            for (let i = 0; i <= last; i++) {
                out.push(col[i] ?? 0);
            }

            return out.length ? out : [0];
        });
    }

    function cloneColumns(M) {
        return M.map(col => col.slice());
    }

    function isZeroColumn(col) {
        if (!col || col.length === 0) return true;
        return col.every(v => v === 0);
    }

    function trimMMColumn(col) {
        const c = (col || []).slice();

        let i = c.length - 1;
        while (i >= 0 && c[i] === 0) i--;

        if (i < 0) return [0];

        c.length = i + 1;
        return c;
    }

    function normalizeMMMatrix(M) {
        return (M || []).map(trimMMColumn);
    }

    function columnsToString(M) {
        if (!M || M.length === 0) return '';

        return M.map(col => {
            const c = trimMMColumn(col);

            if (c.length === 1 && c[0] === 0) {
                return '()';
            }

            return '(' + c.join(',') + ')';
        }).join('');
    }

    function cellsToString(cells) {
        return columnsToString(cellsToColumns(cells));
    }

    function parseMM(input) {
        let t = String(input).trim();

        t = t
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');

        t = t.replace(/\s+/g, '');

        if (!t) {
            throw new Error('请输入有效格式，例如：()(1,1,1)(2,2,1)');
        }

        const columns = [];
        let i = 0;

        while (i < t.length) {
            if (t[i] !== '(') {
                throw new Error('请输入有效格式，例如：()(1,1,1)(2,2,1)');
            }

            const j = t.indexOf(')', i + 1);

            if (j === -1) {
                throw new Error('缺少右括号 )');
            }

            const content = t.slice(i + 1, j);

            if (content === '') {
                columns.push([0]);
            } else {
                const parts = content.split(',');

                if (parts.some(p => !/^-?\d+$/.test(p))) {
                    throw new Error('列中包含无效数字');
                }

                columns.push(parts.map(Number));
            }

            i = j + 1;
        }

        if (columns.length === 0) {
            throw new Error('请输入有效矩阵');
        }

        return columnsToCells(columns);
    }

    function compareColumnsLex(A, B) {
        const maxCols = Math.max(A.length, B.length);

        for (let c = 0; c < maxCols; c++) {
            const ca = trimMMColumn(A[c] || [0]);
            const cb = trimMMColumn(B[c] || [0]);

            const maxRows = Math.max(ca.length, cb.length);

            for (let r = maxRows - 1; r >= 0; r--) {
                const va = r < ca.length ? ca[r] : 0;
                const vb = r < cb.length ? cb[r] : 0;

                if (va < vb) return -1;
                if (va > vb) return 1;
            }
        }

        return 0;
    }

    /* ------------------------------------------------------------
       原算法
    ------------------------------------------------------------ */

    function makeMMEngine() {
        const verticalCache = new Map();

        const verticalCompare = (a, b) => {
            if (a.length > b.length) return 1;
            if (a.length < b.length) return -1;

            for (let i = a.length; i--;) {
                if (a[i] > b[i]) return 1;
                if (a[i] < b[i]) return -1;
            }

            return 0;
        };

        const verticalIncrease = (y, d) => {
            const c = y.slice();

            if (c[d] === undefined) {
                c[d] = 1;
            } else {
                c[d] += 1;
            }

            c.fill(0, 0, d);
            return c;
        };

        const extract = (A, pos) => {
            const x = pos[0];
            const y = pos[1];

            if (!A[x]) return 0;
            return A[x][y] || 0;
        };

        const getVertical = (A, pos) => {
            const x = pos[0];
            const y = pos[1];

            let value;

            if (verticalCache.has(A)) {
                value = verticalCache.get(A);
            } else {
                value = A.map((col, x) => {
                    const result = [];

                    for (let y = 0; y < col.length; ++y) {
                        let i = y;

                        while (
                            --i >= 0 &&
                            extract(A, [x, y]) === extract(A, [x, i])
                        );

                        result.push(
                            verticalIncrease(
                                result[i] ?? [],
                                y - i - 1
                            )
                        );
                    }

                    return result;
                });

                verticalCache.set(A, value);
            }

            if (value[x] && value[x][y] !== undefined) {
                return value[x][y];
            }

            const end = value[x] ? value[x].length - 1 : -1;

            return verticalIncrease(
                end >= 0 ? value[x][end] : [],
                y - end - 1
            );
        };

        const parentCheck = (A, pos) => {
            const x = pos[0];
            const y = pos[1];

            if (!y) return [x - 1, y];

            const p = parent(A, [x, y - 1])[0];
            let i = Math.max(y, A[p].length - 1);

            while (
                extract(A, [p, i]) < extract(A, [x, y]) - 1 ||
                verticalCompare(getVertical(A, [p, i]), getVertical(A, [x, y])) > 0
            ) {
                --i;
            }

            return [p, i];
        };

        const parent = (A, current) => {
            if (!extract(A, current)) return [-1, current[1]];

            let p = current;

            do {
                p = parentCheck(A, p);
            } while (extract(A, p) !== extract(A, current) - 1);

            return p;
        };

        function tailContinuousCount(col) {
            if (col.length === 0) return 0;

            const v = col[col.length - 1];
            let c = 1;

            for (let i = col.length - 2; i >= 0; i--) {
                if (col[i] === v) c++;
                else break;
            }

            return c;
        }

        function buildBadRootSet(M) {
            const lx = M.length - 1;
            const ly = M[lx].length - 1;

            if (ly < 0) return [];

            const lastNonZero = M[lx][ly];
            const set = [];
            let work = [lx, ly];

            do {
                while (extract(M, work) !== lastNonZero - 1) {
                    work = parent(M, work);
                }

                if (!set[work[0]]) set[work[0]] = [];
                set[work[0]].unshift(work[1]);
            } while (--work[1] >= 0);

            return set;
        }

        function fallbackRoot(set) {
            for (let c = 0; c < set.length; c++) {
                if (set[c] && set[c].length > 0) {
                    return [c, set[c][0]];
                }
            }

            return [0, 0];
        }

        function secondRule(M, set, curX, curY) {
            const p = parent(M, [curX, curY]);
            const px = p[0];

            if (px >= 0 && set[px] && set[px].length > 0) {
                return [px, set[px][0]];
            }

            return fallbackRoot(set);
        }

        function nextValidColumn(M, set, startX, startY) {
            let curX = startX;
            let curY = startY;

            while (true) {
                const p = parent(M, [curX, curY]);
                const px = p[0];

                if (px < 0) return null;

                if (set[px] && set[px].length > 0) {
                    return {
                        col: px,
                        y: M[px].length - 1,
                        continuous: tailContinuousCount(M[px])
                    };
                }

                curX = px;
                curY = M[px].length - 1;
            }
        }

        function firstRule(M, set, curX, curY, curL) {
            let targetL = curL;
            let curX2 = curX;
            let curY2 = curY;

            while (true) {
                const next = nextValidColumn(M, set, curX2, curY2);
                if (!next) break;

                const px = next.col;
                const pL = next.continuous;

                if (pL < targetL) {
                    targetL = pL;
                    curX2 = px;
                    curY2 = M[px].length - 1;

                    if (targetL === 1) {
                        if (set[px] && set[px].length > 0) {
                            return [px, set[px][0]];
                        }
                    }
                } else {
                    curX2 = px;
                    curY2 = M[px].length - 1;
                }
            }

            return fallbackRoot(set);
        }

        function thirdRule(M, set, curX, curY, curL) {
            let targetL = curL;
            let curX2 = curX;
            let curY2 = curY;
            let lastCheckedCol = null;

            while (true) {
                const next = nextValidColumn(M, set, curX2, curY2);
                if (!next) break;

                const px = next.col;
                const pL = next.continuous;

                if (pL < targetL) {
                    lastCheckedCol = curX2;
                    targetL = pL;
                    curX2 = px;
                    curY2 = M[px].length - 1;

                    if (targetL === 1) {
                        if (
                            lastCheckedCol !== null &&
                            set[lastCheckedCol] &&
                            set[lastCheckedCol].length > 0
                        ) {
                            const candidates = set[lastCheckedCol];
                            const minRow = Math.min(...candidates);
                            return [lastCheckedCol, minRow];
                        } else if (set[px] && set[px].length > 0) {
                            return [px, set[px][0]];
                        }
                    }
                } else {
                    lastCheckedCol = curX2;
                    curX2 = px;
                    curY2 = M[px].length - 1;
                }
            }

            return fallbackRoot(set);
        }

        function autoFindRoot(M, set) {
            const lx = M.length - 1;
            const ly = M[lx].length - 1;
            const lastVal = M[lx][ly];
            const curL = tailContinuousCount(M[lx]);

            if (curL === 1) {
                return secondRule(M, set, lx, ly);
            }

            if (lastVal === 1) {
                return firstRule(M, set, lx, ly, curL);
            }

            return thirdRule(M, set, lx, ly, curL);
        }

        function expandRaw(M, fsTerm) {
            const lx = M.length - 1;
            const ly = M[lx].length - 1;

            const set = buildBadRootSet(M);
            const root = autoFindRoot(M, set);

            const width = lx - root[0];
            const height = ly - root[1];

            const A = M.map(col => col.slice());

            --A[lx][ly];

            M[root[0]].slice(root[1]).forEach((value, dy) => {
                A[lx][ly + dy] = value;
            });

            const ascendingCache = {};

            const ascendingAt = current => {
                const key = '' + current;

                if (ascendingCache[key] !== undefined) {
                    return ascendingCache[key];
                }

                if (current[0] < root[0]) {
                    ascendingCache[key] = -1;
                    return -1;
                }

                if (current[0] === root[0]) {
                    ascendingCache[key] = current[1];
                    return current[1];
                }

                const v = ascendingAt(parent(A, current));
                ascendingCache[key] = v;
                return v;
            };

            for (let n = 1; n <= fsTerm; ++n) {
                const reference = [];
                let y1 = 0;
                let y2 = 0;

                while (y2 <= root[1] + height * n) {
                    const cmp = verticalCompare(
                        getVertical(A, [root[0], y1 + 1]),
                        getVertical(A, [root[0] + width * n, y2])
                    );

                    if (cmp > 0 || y1 >= root[1]) {
                        reference[y1] = y2;
                        ++y2;
                    } else {
                        ++y1;
                    }
                }

                for (let dx = 1; dx <= width; ++dx) {
                    const x = root[0] + dx;
                    const targetCol = A[x + width * n] = [];
                    let lastMagma = -1;

                    A[x].forEach((value, y) => {
                        const asc = ascendingAt([x, y]);

                        if (~asc) {
                            if (
                                asc <= root[1] &&
                                !verticalCompare(
                                    getVertical(A, [root[0], asc]),
                                    getVertical(A, [x, y])
                                )
                            ) {
                                for (
                                    let j = (reference[asc - 1] ?? -1) + 1;
                                    j <= reference[asc];
                                    ++j
                                ) {
                                    targetCol.push(
                                        value
                                        - extract(A, [root[0], asc])
                                        + extract(A, [root[0] + width * n, j])
                                    );
                                }

                                lastMagma = asc;
                            } else {
                                if (~lastMagma) {
                                    targetCol.push(
                                        value
                                        - extract(A, [root[0], lastMagma])
                                        + extract(A, [root[0] + width * n, reference[lastMagma]])
                                    );
                                } else {
                                    targetCol.push(
                                        value
                                        - extract(A, [root[0], 0])
                                        + extract(A, [root[0] + width * n, 0])
                                    );
                                }
                            }
                        } else {
                            targetCol.push(value);
                        }
                    });
                }

                verticalCache.delete(A);
            }

            A.forEach(col => {
                let i = col.length - 1;
                while (i >= 0 && !col[i]) i--;
                col.splice(i + 1);

                if (col.length === 0) {
                    col.push(0);
                }
            });

            return {
                matrix: normalizeMMMatrix(A),
                root
            };
        }

        return {
            expandRaw,
            autoFindRootFromMatrix(M) {
                const set = buildBadRootSet(M);
                return autoFindRoot(M, set);
            }
        };
    }

    function findVisibleCellIndexInColumn(cells, col, row) {
        if (!cells || col === undefined || col < 0) return -1;

        let idx = cells.findIndex(
            cell => cell.col === col && cell.row === row
        );

        if (idx >= 0) return idx;

        idx = cells.findIndex(
            cell => cell.col === col
        );

        return idx;
    }

    function expandMM(matrixInput, times) {
        const matrix = normalizeMMMatrix(matrixInput);
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

        if (isZeroColumn(lastCol)) {
            const goodMatrix = matrix.slice(0, cols - 1);
            const goodCells = columnsToCells(goodMatrix);

            return {
                result: goodCells,
                goodLength: goodCells.length,
                groups: [],
                badRootIndex: -1,
                badRootColIndex: -1,
                badRootRowIndex: -1
            };
        }

        const engineForRoot = makeMMEngine();
        const root = engineForRoot.autoFindRootFromMatrix(matrix);

        function expandedAt(k) {
            const engine = makeMMEngine();
            return engine.expandRaw(cloneColumns(matrix), k).matrix;
        }

        const baseMatrix = expandedAt(0);
        const baseCells = columnsToCells(baseMatrix);

        const finalMatrix = expandedAt(times);
        const resultCells = columnsToCells(finalMatrix);

        const groups = [];
        let prevLen = baseCells.length;

        for (let k = 1; k <= times; k++) {
            const km = expandedAt(k);
            const kc = columnsToCells(km);
            const group = kc.slice(prevLen);

            groups.push(group);
            prevLen = kc.length;
        }

        const badRootIndex = findVisibleCellIndexInColumn(
            resultCells,
            root[0],
            root[1]
        );

        return {
            result: resultCells,
            goodLength: baseCells.length,
            groups,
            badRootIndex,
            badRootColIndex: root[0],
            badRootRowIndex: root[1]
        };
    }

    function makeMM311LimitItem(n) {
        return {
            type: 'mm311-limit-item',
            n,
            expr: columnsToCells([
                [0],
                Array(n).fill(1)
            ])
        };
    }
    
    function isMM311LimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === 'mm311-limit-item';
    }
    
    function isMM311LimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            isMM311LimitItem(seq[0]);
    }
    
    function formatMM311LimitItem(item) {
        return cellsToString(item.expr);
    }

    registerNotation({
        id: 'MM311',
        name: 'MM3.1.1',
        placeholder: '例如：()(1,1,1)(2,2,1,1,1)',
        defaultTimes: 3,
        lexDesc: true,

        compactTokens: true,

        parse(input) {
            return parseMM(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
        
            if (isMM311LimitSeq(seq)) {
                return 'sup{' + seq.map(formatMM311LimitItem).join(',') + ',...}';
            }
        
            if (isCellSeq(seq)) {
                return cellsToString(seq);
            }
        
            return columnsToString(seq);
        },

        formatToken(token) {
            if (isMM311LimitItem(token)) {
                return formatMM311LimitItem(token);
            }
        
            const isLast = token.row === token.colHeight - 1;
        
            if (token.row === 0) {
                // MM3.1.1 中零列显示为 ()
                if (token.v === 0 && isLast) {
                    return '()';
                }
        
                return '(' + token.v + (isLast ? ')' : '');
            }
        
            return String(token.v) + (isLast ? ')' : '');
        },

        separator(curr, next) {
            // 极限表达式中各项之间用逗号
            if (isMM311LimitItem(curr) || isMM311LimitItem(next)) {
                return ',';
            }
        
            // 普通矩阵跨列不加分隔符
            if (
                curr &&
                next &&
                curr.row !== undefined &&
                next.row !== undefined &&
                next.row === 0
            ) {
                return '';
            }
        
            // 同列内部加逗号
            return ',';
        },

        getTokenGroupKey(token, index) {
            if (isMM311LimitItem(token)) return index;
            return token.col;
        },

        compareSeq(a, b) {
            const ma = isCellSeq(a) ? cellsToColumns(a) : a;
            const mb = isCellSeq(b) ? cellsToColumns(b) : b;

            return compareColumnsLex(ma, mb);
        },

        getBadRootIndex(seq) {
            try {
                const matrix = isCellSeq(seq)
                    ? cellsToColumns(seq)
                    : normalizeMMMatrix(seq);

                if (!matrix || matrix.length === 0) return -1;

                const lastCol = matrix[matrix.length - 1];
                if (isZeroColumn(lastCol)) return -1;

                const engine = makeMMEngine();
                const root = engine.autoFindRootFromMatrix(matrix);

                const cells = isCellSeq(seq) ? seq : columnsToCells(matrix);

                return findVisibleCellIndexInColumn(
                    cells,
                    root[0],
                    root[1]
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

            const matrix = isCellSeq(seq)
                ? cellsToColumns(seq)
                : normalizeMMMatrix(seq);

            if (!matrix || matrix.length === 0) return true;

            return isZeroColumn(matrix[matrix.length - 1]);
        },

        countStep(seq) {
            const matrix = isCellSeq(seq)
                ? cellsToColumns(seq)
                : normalizeMMMatrix(seq);
        
            if (!matrix || matrix.length === 0) return seq;
        
            if (isZeroColumn(matrix[matrix.length - 1])) {
                return columnsToCells(matrix);
            }
        
            try {
                const engine = makeMMEngine();
        
                const nextMatrix = engine.expandRaw(
                    cloneColumns(matrix),
                    0
                ).matrix;
        
                const normalizedNext = normalizeMMMatrix(nextMatrix);
        
                if (columnsToString(normalizedNext) === columnsToString(matrix)) {
                    return columnsToCells(matrix.slice(0, -1).concat([[0]]));
                }
        
                return columnsToCells(normalizedNext);
            } catch {
                const fallback = cloneColumns(matrix);
                fallback[fallback.length - 1] = [0];
                return columnsToCells(fallback);
            }
        },

        expand(seq, times) {
            const matrix = isCellSeq(seq)
                ? cellsToColumns(seq)
                : normalizeMMMatrix(seq);

            return expandMM(matrix, times);
        },

        limit: {
            initial() {
                return [
                    makeMM311LimitItem(1),
                    makeMM311LimitItem(2),
                    makeMM311LimitItem(3)
                ];
            },
        
            extend(seq) {
                return [
                    ...seq,
                    makeMM311LimitItem(seq.length + 1)
                ];
            },
        
            select(seq, index) {
                const item = seq[index];
        
                if (!isMM311LimitItem(item)) return [];
        
                return item.expr;
            }
        }
    });
})();