/* ============================================================
   0-Y
============================================================ */

(function() {
    function parse0Y(input) {
        const seq = String(input)
            .trim()
            .replaceAll('，', ',')
            .split(/[,，\s]+/)
            .map(s => s.trim())
            .filter(Boolean)
            .map(s => {
                if (!/^-?\d+$/.test(s)) {
                    throw new Error('0-Y 序列中包含无效数字');
                }
                return Number(s);
            });

        if (seq.length < 2) {
            throw new Error('0-Y 序列长度至少为 2，例如：1,4,6,4');
        }

        return seq;
    }

    function format0Y(seq) {
        return seq.join(',');
    }

    function compare0Y(a, b) {
        const n = Math.min(a.length, b.length);

        for (let i = 0; i < n; i++) {
            if (a[i] < b[i]) return -1;
            if (a[i] > b[i]) return 1;
        }

        if (a.length < b.length) return -1;
        if (a.length > b.length) return 1;
        return 0;
    }

    class ExpansionProcess0Y {
        constructor(initialSeq, n) {
            this.rows = [];
            this.parents = [];
            this.initialSeq = [...initialSeq];
            this.N = n;
            this.badRootInfo = null;
            this.specialPositions = [];
        }

        getAncestorChain(seq, parentIndices, startIndex = -1) {
            if (startIndex === -1) {
                startIndex = seq.length - 1;
            }

            const chain = [];
            let current = startIndex;

            while (true) {
                const p = parentIndices[current];
                if (p === -1) break;
                chain.push(p);
                current = p;
            }

            return chain;
        }

        calcNormalParents(seq) {
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

        calcDiffParents(seq, prevSeq, prevParents) {
            const p = new Array(seq.length).fill(-1);

            for (let i = 0; i < seq.length; i++) {
                const ancestorChain = this.getAncestorChain(prevSeq, prevParents, i);
                const ancestorSet = new Set(ancestorChain);

                for (let j = i - 1; j >= 0; j--) {
                    if (ancestorSet.has(j) && seq[j] < seq[i]) {
                        p[i] = j;
                        break;
                    }
                }
            }

            return p;
        }

        run() {
            let currentSeq = [...this.initialSeq];
            const rawParents = this.calcNormalParents(currentSeq);
            const lastIdx = currentSeq.length - 1;

            // 后继序数：末项没有 parent，直接删除末项
            if (rawParents[lastIdx] === -1) {
                currentSeq.pop();

                return {
                    result: currentSeq,
                    matrixBefore: [
                        {
                            seq: this.initialSeq,
                            parents: rawParents
                        }
                    ],
                    matrixAfter: null,
                    badRootIndex: -1,
                    originalLastIndex: lastIdx,
                    badPartLength: 0,
                    specialPositions: []
                };
            }

            this.rows.push(currentSeq);
            this.parents.push(rawParents);

            let level = 0;

            while (true) {
                const seq = this.rows[level];
                const pars = this.parents[level];

                const lastVal = seq[seq.length - 1];
                const parentIdx = pars[seq.length - 1];
                const parentVal = seq[parentIdx];
                const diff = lastVal - parentVal;

                if (diff === 1) {
                    this.badRootInfo = {
                        level,
                        index: parentIdx,
                        value: parentVal
                    };
                    break;
                }

                const nextSeq = [];

                for (let k = 0; k < seq.length; k++) {
                    if (k === 0) {
                        nextSeq.push(this.initialSeq[0]);
                    } else {
                        if (pars[k] !== -1) {
                            nextSeq.push(seq[k] - seq[pars[k]]);
                        } else {
                            nextSeq.push(seq[k]);
                        }
                    }
                }

                this.rows.push(nextSeq);

                const nextParents = this.calcDiffParents(nextSeq, seq, pars);
                this.parents.push(nextParents);

                level++;

                // 防止异常表达式死循环
                if (level > 200) {
                    throw new Error('0-Y 展开层数过多，可能输入异常');
                }
            }

            const y = this.badRootInfo.index;
            const x = this.rows[0].length - 1;
            const L = x - y;
            const N = this.N;

            const baseLen = x;
            const totalLen = baseLen + N * L;

            const expandedParents = [];

            for (let r = 0; r < this.rows.length; r++) {
                this.specialPositions.push(new Set());
            }

            for (let r = 0; r < this.rows.length; r++) {
                const oldPars = this.parents[r];
                const newPars = new Array(totalLen).fill(-1);

                for (let i = y; i <= x; i++) {
                    const oldParent = oldPars[i];

                    // 标准模式下，旧 parent < y 的内部位置标紫，保留给绘图用
                    if (oldParent !== -1 && oldParent < y && i > y && i < x) {
                        this.specialPositions[r].add(i);
                    }

                    for (let n = 0; n <= N; n++) {
                        const targetIdx = i + n * L;

                        if (targetIdx >= totalLen) break;

                        if (oldParent === -1) {
                            newPars[targetIdx] = -1;
                        } else {
                            if (oldParent < y) {
                                newPars[targetIdx] = oldParent;
                            } else {
                                newPars[targetIdx] = oldParent + n * L;
                            }
                        }
                    }
                }

                for (let i = 0; i < y; i++) {
                    newPars[i] = oldPars[i];
                }

                expandedParents.push(newPars);
            }

            const expandedRows = this.buildExpandedSequence(expandedParents, y, x, L, N);

            const matrixDataBefore = this.rows.map((row, i) => {
                return {
                    seq: row,
                    parents: this.parents[i]
                };
            });

            const matrixDataAfter = expandedRows.map((row, i) => {
                return {
                    seq: row,
                    parents: expandedParents[i]
                };
            });

            return {
                result: expandedRows[0],
                matrixBefore: matrixDataBefore,
                matrixAfter: matrixDataAfter,
                badRootIndex: y,
                originalLastIndex: x,
                badPartLength: L,
                specialPositions: this.specialPositions
            };
        }

        buildExpandedSequence(expandedParents, y, x, L, N) {
            const lastRowIdx = this.rows.length - 1;
            const lastRowSeq = this.rows[lastRowIdx];

            let newLastRowSeq = [];

            for (let i = 0; i < x; i++) {
                newLastRowSeq.push(lastRowSeq[i]);
            }

            const badPart = lastRowSeq.slice(y, x);

            for (let n = 0; n < N; n++) {
                newLastRowSeq = newLastRowSeq.concat(badPart);
            }

            const expandedRows = new Array(this.rows.length);
            expandedRows[lastRowIdx] = newLastRowSeq;

            for (let r = lastRowIdx - 1; r >= 0; r--) {
                const currentRowLen = expandedParents[r].length;
                const newRow = new Array(currentRowLen).fill(0);
                const currentPars = expandedParents[r];
                const nextRowDiff = expandedRows[r + 1];

                newRow[0] = this.initialSeq[0];

                for (let i = 1; i < currentRowLen; i++) {
                    const parentIdx = currentPars[i];
                    const diffVal = nextRowDiff[i];

                    let parentVal = 0;

                    if (parentIdx !== -1) {
                        parentVal = newRow[parentIdx];
                    }

                    newRow[i] = parentVal + diffVal;
                }

                expandedRows[r] = newRow;
            }

            return expandedRows;
        }
    }

    function getColorForIndex0Y(idx, y, x, L, N, specialPositions = null, rowIndex = 0) {
        if (specialPositions && specialPositions[rowIndex]) {
            for (const p of specialPositions[rowIndex]) {
                for (let n = 0; n <= N; n++) {
                    if (idx === p + n * L) {
                        return '#a855f7';
                    }
                }
            }
        }

        if (idx < y) {
            return '#22c55e';
        }

        if (idx === y) {
            return '#ef4444';
        }

        if (idx > y && idx < x) {
            return '#333';
        }

        for (let n = 1; n <= N; n++) {
            const start = y + n * L;
            const end = x + n * L;

            if (idx >= start && idx < end) {
                return n % 2 === 1 ? '#00BFFF' : '#EEB422';
            }
        }

        return '#999';
    }

    function drawMountainActions0Y(matrixData, colorInfo = null, scale = 1.0, offsetY = 0) {
        if (!matrixData || matrixData.length === 0) {
            return {
                width: 1,
                height: 1,
                actions: []
            };
        }

        const cellWidth = 50 * scale;
        const rowHeight = 60 * scale;
        const leftPadding = 60 * scale;
        const verticalMargin = 15 * scale;

        const numRows = matrixData.length;
        const maxCols = Math.max(...matrixData.map(d => d.seq.length));

        const width = maxCols * cellWidth + leftPadding + 20 * scale;
        const height = verticalMargin * 2 + (numRows - 1) * rowHeight;

        const actions = [];

        actions.push({ type: 'lineWidth', value: 1.5 * scale });
        actions.push({ type: 'font', size: 14 * scale, font: 'Arial' });

        // 先画线
        for (let r = 0; r < numRows; r++) {
            const rowData = matrixData[r];
            const y = offsetY + height - verticalMargin - r * rowHeight;
            const isTopRow = r === numRows - 1;

            for (let i = 0; i < rowData.seq.length; i++) {
                const x = leftPadding + i * cellWidth;
                const parentIdx = rowData.parents[i];

                let color = '#333';

                if (!isTopRow && colorInfo) {
                    color = getColorForIndex0Y(
                        i,
                        colorInfo.y,
                        colorInfo.x,
                        colorInfo.L,
                        colorInfo.N,
                        colorInfo.specialPositions,
                        r
                    );
                }

                if (!isTopRow) {
                    const upperY = y - rowHeight;

                    actions.push({ type: 'strokeStyle', value: color });
                    actions.push({
                        type: 'line',
                        start: {
                            x,
                            y: y - 10 * scale
                        },
                        end: {
                            x,
                            y: upperY + 10 * scale
                        }
                    });

                    if (parentIdx !== -1) {
                        const parentX = leftPadding + parentIdx * cellWidth;
                        const parentY = y;

                        actions.push({
                            type: 'line',
                            start: {
                                x,
                                y: upperY + 10 * scale
                            },
                            end: {
                                x: parentX,
                                y: parentY - 10 * scale
                            }
                        });
                    }
                }
            }
        }

        // 再画数字和行标
        for (let r = 0; r < numRows; r++) {
            const rowData = matrixData[r];
            const y = offsetY + height - verticalMargin - r * rowHeight;
            const isTopRow = r === numRows - 1;

            for (let i = 0; i < rowData.seq.length; i++) {
                const x = leftPadding + i * cellWidth;
                const value = rowData.seq[i];

                let color = '#333';

                if (!isTopRow && colorInfo) {
                    color = getColorForIndex0Y(
                        i,
                        colorInfo.y,
                        colorInfo.x,
                        colorInfo.L,
                        colorInfo.N,
                        colorInfo.specialPositions,
                        r
                    );
                }

                actions.push({ type: 'fillStyle', value: color });
                actions.push({ type: 'font', size: 14 * scale, font: 'Arial' });
                actions.push({
                    type: 'text',
                    value: String(value),
                    pos: {
                        x,
                        y: y + 5 * scale
                    },
                    h_center: true
                });
            }

            actions.push({ type: 'fillStyle', value: '#999' });
            actions.push({ type: 'font', size: 12 * scale, font: 'Arial' });
            actions.push({
                type: 'text',
                value: `Row ${r}`,
                pos: {
                    x: 10 * scale,
                    y: y + 4 * scale
                }
            });
        }

        return {
            width,
            height,
            actions
        };
    }

    function drawDiagram0YTwoBlocks(seq, times) {
        if (!Array.isArray(seq) || seq.length < 2) {
            return undefined;
        }
    
        let data;
    
        try {
            const process = new ExpansionProcess0Y(seq, times);
            data = process.run();
        } catch {
            return undefined;
        }
    
        if (!data || !data.matrixBefore) {
            return undefined;
        }
    
        const colorInfo = data.badRootIndex !== -1
            ? {
                y: data.badRootIndex,
                x: data.originalLastIndex,
                L: data.badPartLength,
                N: times,
                specialPositions: data.specialPositions
            }
            : null;
    
        const before = drawMountainActions0YCompact(data.matrixBefore, colorInfo, 0);
    
        // 后继序数没有 matrixAfter，就只显示展开前
        if (!data.matrixAfter) {
            const padding = 6;
    
            return {
                width: before.width + padding * 2,
                height: before.height + padding * 2,
                noLimitX: true,
                actions: [
                    { type: 'fillStyle', value: 'white' },
                    {
                        type: 'fillRect',
                        value: {
                            x: 0,
                            y: 0,
                            w: before.width + padding * 2,
                            h: before.height + padding * 2
                        }
                    },
                    ...shiftDiagramActions0Y(before.actions, padding, padding)
                ]
            };
        }
    
        const gap = 12;
        const padding = 6;
    
        const afterOffsetY = before.height + gap;
    
        const after = drawMountainActions0YCompact(
            data.matrixAfter,
            colorInfo,
            afterOffsetY
        );
    
        const width = Math.max(before.width, after.width);
        const height = before.height + gap + after.height;
    
        return {
            width: width + padding * 2,
            height: height + padding * 2,
            noLimitX: true,
            actions: [
                { type: 'fillStyle', value: 'white' },
                {
                    type: 'fillRect',
                    value: {
                        x: 0,
                        y: 0,
                        w: width + padding * 2,
                        h: height + padding * 2
                    }
                },
                ...shiftDiagramActions0Y(before.actions, padding, padding),
                ...shiftDiagramActions0Y(after.actions, padding, padding)
            ]
        };
    }

    function shiftDiagramActions0Y(actions, dx, dy) {
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

    function isSuccessor0Y(seq) {
        if (!Array.isArray(seq) || seq.length === 0) return true;

        const parents = new ExpansionProcess0Y(seq, 1).calcNormalParents(seq);
        return parents[seq.length - 1] === -1;
    }

    function make0YLimitItem(n) {
        return {
            type: '0y-limit-item',
            n,
            expr: [1, n]
        };
    }

    function is0YLimitItem(x) {
        return x &&
            typeof x === 'object' &&
            x.type === '0y-limit-item';
    }

    function is0YLimitSeq(seq) {
        return Array.isArray(seq) &&
            seq.length > 0 &&
            is0YLimitItem(seq[0]);
    }

    function format0YLimitItem(item) {
        return item.expr.join(',');
    }

    function drawMountainActions0YCompact(matrixData, colorInfo = null, offsetY = 0) {
        if (!matrixData || matrixData.length === 0) {
            return {
                width: 1,
                height: 1,
                actions: []
            };
        }
    
        // 紧凑参数
        const cellWidth = 28;
        const rowHeight = 34;
        const leftPadding = 16;
        const verticalPadding = 10;
    
        const numRows = matrixData.length;
        const maxCols = Math.max(...matrixData.map(d => d.seq.length));
    
        const width = leftPadding * 2 + Math.max(0, maxCols - 1) * cellWidth;
        const height = verticalPadding * 2 + Math.max(0, numRows - 1) * rowHeight;
    
        const actions = [];
    
        // 先画线
        for (let r = 0; r < numRows; r++) {
            const rowData = matrixData[r];
            const y = offsetY + height - verticalPadding - r * rowHeight;
            const isTopRow = r === numRows - 1;
    
            for (let i = 0; i < rowData.seq.length; i++) {
                const x = leftPadding + i * cellWidth;
                const parentIdx = rowData.parents[i];
    
                let color = '#333';
    
                if (!isTopRow && colorInfo) {
                    color = getColorForIndex0Y(
                        i,
                        colorInfo.y,
                        colorInfo.x,
                        colorInfo.L,
                        colorInfo.N,
                        colorInfo.specialPositions,
                        r
                    );
                }
    
                if (!isTopRow) {
                    const upperY = y - rowHeight;
    
                    actions.push({ type: 'strokeStyle', value: color });
                    actions.push({ type: 'lineWidth', value: 1.2 });
    
                    actions.push({
                        type: 'line',
                        start: {
                            x,
                            y: y - 8
                        },
                        end: {
                            x,
                            y: upperY + 8
                        }
                    });
    
                    if (parentIdx !== -1) {
                        const parentX = leftPadding + parentIdx * cellWidth;
    
                        actions.push({
                            type: 'line',
                            start: {
                                x,
                                y: upperY + 8
                            },
                            end: {
                                x: parentX,
                                y: y - 8
                            }
                        });
                    }
                }
            }
        }
    
        // 再画数字
        for (let r = 0; r < numRows; r++) {
            const rowData = matrixData[r];
            const y = offsetY + height - verticalPadding - r * rowHeight;
            const isTopRow = r === numRows - 1;
    
            for (let i = 0; i < rowData.seq.length; i++) {
                const x = leftPadding + i * cellWidth;
                const value = rowData.seq[i];
    
                let color = '#333';
    
                if (!isTopRow && colorInfo) {
                    color = getColorForIndex0Y(
                        i,
                        colorInfo.y,
                        colorInfo.x,
                        colorInfo.L,
                        colorInfo.N,
                        colorInfo.specialPositions,
                        r
                    );
                }
    
                actions.push({ type: 'fillStyle', value: color });
                actions.push({ type: 'font', size: 11, font: 'Arial' });
    
                actions.push({
                    type: 'text',
                    value: String(value),
                    pos: {
                        x,
                        y: y + 4
                    },
                    h_center: true
                });
            }
        }
    
        return {
            width,
            height,
            actions
        };
    }

    registerNotation({
        id: '0Y',
        name: '0-Y',
        placeholder: '例如：1,4,6,4',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return parse0Y(input);
        },

        format(seq) {
            if (is0YLimitSeq(seq)) {
                return 'sup{' + seq.map(format0YLimitItem).join(',') + ',...}';
            }

            return format0Y(seq);
        },

        formatToken(token) {
            if (is0YLimitItem(token)) {
                return format0YLimitItem(token);
            }

            return String(token);
        },

        separator(curr, next) {
            return ',';
        },

        compareSeq(a, b) {
            return compare0Y(a, b);
        },

        getBadRootIndex(seq) {
            if (!Array.isArray(seq) || seq.length < 2) return -1;

            try {
                const data = new ExpansionProcess0Y(seq, 1).run();
                return data.badRootIndex ?? -1;
            } catch {
                return -1;
            }
        },

        isSuccessor(seq) {
            try {
                return isSuccessor0Y(seq);
            } catch {
                return true;
            }
        },

        expand(seq, times) {
            const process = new ExpansionProcess0Y(seq, times);
            const data = process.run();

            const result = data.result || [];

            // 后继序数：直接删除末项
            if (data.badRootIndex === -1 || !data.matrixAfter) {
                return {
                    result,
                    goodLength: result.length,
                    groups: [],
                    badRootIndex: -1
                };
            }

            const x = data.originalLastIndex;
            const L = data.badPartLength;
            const groups = [];

            // good 部分是原序列去掉末项，即前 x 项
            const goodLength = x;

            for (let n = 1; n <= times; n++) {
                const start = x + (n - 1) * L;
                const end = x + n * L;
                groups.push(result.slice(start, end));
            }

            return {
                result,
                goodLength,
                groups,
                badRootIndex: data.badRootIndex
            };
        },

        drawDiagram(seq) {
            // 悬停图使用当前展开次数输入框的值
            const times = parseInt(timesInput.value, 10) || this.defaultTimes || 3;
            return drawDiagram0YTwoBlocks(seq, times);
        },

        limit: {
            initial() {
                return [
                    make0YLimitItem(2),
                    make0YLimitItem(3),
                    make0YLimitItem(4),
                    make0YLimitItem(5)
                ];
            },

            extend(seq) {
                return [
                    ...seq,
                    make0YLimitItem(seq.length + 2)
                ];
            },

            // LPrSS 式：点击 1,n 直接得到表达式 1,n
            select(seq, index) {
                const item = seq[index];

                if (!is0YLimitItem(item)) return [];

                return item.expr;
            }
        }
    });
})();