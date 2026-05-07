/* ============================================================
   BDHM - Bad Descendants Hyper Matrix
   输入例：1,(1)2,(2,2)3
============================================================ */

(function() {
    function bdClone(seq) {
        return seq.map(item => ({
            inner: [...item.inner],
            outer: item.outer
        }));
    }

    function bdSameItem(a, b) {
        if (!a || !b) return false;
        if (a.outer !== b.outer) return false;
        if (a.inner.length !== b.inner.length) return false;
        for (let i = 0; i < a.inner.length; i++) {
            if (a.inner[i] !== b.inner[i]) return false;
        }
        return true;
    }

    function bdSameTriple(a, b) {
        return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2];
    }

    function bdTripleInList(t, list) {
        return list.some(x => bdSameTriple(x, t));
    }

    function bdFormatItem(item) {
        if (!item.inner || item.inner.length === 0) {
            return String(item.outer);
        }
        return '(' + item.inner.join(',') + ')' + item.outer;
    }

    function bdFormatSequence(seq) {
        return seq.map(bdFormatItem).join(',');
    }

    function bdParse(input) {
        let s = String(input).trim();
    
        s = s
            .replaceAll('（', '(')
            .replaceAll('）', ')')
            .replaceAll('，', ',');
    
        s = s.replace(/\s+/g, '');
    
        if (!s) {
            throw new Error('请输入 BDHM 表达式，例如：1,(1)2,(2,2)3');
        }
    
        if (/[^0-9(),]/.test(s)) {
            throw new Error('输入包含非法字符，只允许英文括号、逗号和数字');
        }
    
        if (s.includes(',,') || s.startsWith(',') || s.endsWith(',')) {
            throw new Error('逗号格式错误');
        }
    
        const result = [];
        let i = 0;
    
        function readNumber() {
            const start = i;
    
            while (i < s.length && /[0-9]/.test(s[i])) {
                i++;
            }
    
            if (start === i) {
                return null;
            }
    
            return Number(s.slice(start, i));
        }
    
        while (i < s.length) {
            // 情况 1：单独的 1
            if (/[0-9]/.test(s[i])) {
                const n = readNumber();
    
                if (n !== 1) {
                    throw new Error('逗号之间出现了单独的不等于 1 的数字：' + n);
                }
    
                result.push({
                    inner: [],
                    outer: 1
                });
            }
    
            // 情况 2：(a,b,c)n
            else if (s[i] === '(') {
                i++; // skip '('
    
                const inner = [];
    
                if (s[i] === ')') {
                    throw new Error('BDHM 的括号内不能为空');
                }
    
                while (i < s.length) {
                    const n = readNumber();
    
                    if (n === null) {
                        throw new Error('括号内数字格式错误');
                    }
    
                    inner.push(n);
    
                    if (s[i] === ',') {
                        i++;
                        continue;
                    }
    
                    if (s[i] === ')') {
                        i++;
                        break;
                    }
    
                    throw new Error('括号内格式错误');
                }
    
                if (i > s.length || s[i - 1] !== ')') {
                    throw new Error('缺少右括号');
                }
    
                const outer = readNumber();
    
                if (outer === null) {
                    throw new Error('括号后必须有数字，例如：(1)2');
                }
    
                result.push({
                    inner,
                    outer
                });
            }
    
            else {
                throw new Error('输入格式错误');
            }
    
            // 项之间必须用逗号分隔
            if (i < s.length) {
                if (s[i] !== ',') {
                    throw new Error('项之间必须用逗号分隔');
                }
                i++;
            }
        }
    
        // 基本合法性检查
        for (const item of result) {
            if (item.inner.some(v => v <= 0)) {
                throw new Error('内项必须为正整数');
            }
    
            for (let j = 0; j < item.inner.length - 1; j++) {
                if (item.inner[j + 1] > item.inner[j]) {
                    throw new Error('内项序列必须非递增');
                }
            }
        }
    
        // 高度合法性检查
        for (let idx = 0; idx < result.length; idx++) {
            const item = result[idx];
            const currentHeight = item.inner.length;
    
            if (idx === 0 && currentHeight > 1) {
                throw new Error('第一项高度不能大于 1');
            }
    
            if (item.inner.length > 0) {
                const hVal = item.inner[item.inner.length - 1];
    
                if (hVal < 1 || hVal > result.length) {
                    throw new Error('最高内项值 ' + hVal + ' 超出范围');
                }
    
                const targetHeight = result[hVal - 1].inner.length;
    
                if (currentHeight > targetHeight + 1) {
                    throw new Error('高度超出限制');
                }
            }
        }
    
        return result;
    }

    function Z(data, x, y) {
        if (y === 0) return 1;
        if (x < 1 || x > data.length) throw new Error('Z: 横坐标超出范围');

        const item = data[x - 1];

        if (item.inner.length === 0 && item.outer === 1) return 1;

        if (y < 1 || y > item.inner.length) {
            throw new Error('Z: 项没有该高度的内项');
        }

        return item.inner[y - 1];
    }

    function P(data, xa, ya) {
        const xb = Z(data, xa, ya);
        if (xb < 1 || xb > data.length) throw new Error('P: 横坐标超出范围');

        const item = data[xb - 1];

        if (item.inner.length === 0 && item.outer === 1) {
            return [xb, 0, 1];
        }

        if (ya < 1 || ya > item.inner.length) {
            throw new Error('P: 项没有该高度的内项');
        }

        return [xb, ya, item.inner[ya - 1]];
    }

    function PP(data, xa, ya) {
        const xc = Z(data, xa, ya);
        if (xc < 1 || xc > data.length) throw new Error('PP: 横坐标超出范围');

        const item = data[xc - 1];

        if (item.inner.length === 0 && item.outer === 1) {
            return [xc, 0, 1];
        }

        if (ya - 1 < 1 || ya - 1 > item.inner.length) {
            throw new Error('PP: 项没有该高度的内项');
        }

        return [xc, ya - 1, item.inner[ya - 2]];
    }

    function UP(data, xa, ya) {
        if (xa < 1 || xa > data.length) throw new Error('UP: 横坐标超出范围');

        const item = data[xa - 1];

        if (ya + 1 < 1 || ya + 1 > item.inner.length) {
            throw new Error('UP: 项没有该高度的内项');
        }

        return [xa, ya + 1, item.inner[ya]];
    }

    function RT(data, a) {
        const nx = a[0] + 1;
        if (nx < 1 || nx > data.length) throw new Error('RT: 横坐标超出范围');
        return data[nx - 1];
    }

    function itemAt(data, x) {
        if (x < 1 || x > data.length) throw new Error('item: 横坐标超出范围');
        return data[x - 1];
    }

    function S(item1, item2) {
        const sp1 = item1.inner.length === 0 && item1.outer === 1;
        const sp2 = item2.inner.length === 0 && item2.outer === 1;

        if (sp1 && sp2) return 'equal';
        if (sp1) return item1;
        if (sp2) return item2;

        let y = 1;

        while (true) {
            const has1 = y <= item1.inner.length;
            const has2 = y <= item2.inner.length;

            if (has1 && has2) {
                const a = item1.inner[y - 1];
                const b = item2.inner[y - 1];

                if (a > b) return item2;
                if (b > a) return item1;

                const next1 = y + 1 <= item1.inner.length;
                const next2 = y + 1 <= item2.inner.length;

                if (next1 && !next2) return item2;
                if (!next1 && next2) return item1;
                if (next1 && next2) {
                    y++;
                    continue;
                }

                if (item1.outer > item2.outer) return item2;
                if (item2.outer > item1.outer) return item1;
                return 'equal';
            }

            if (has1) return item2;
            return item1;
        }
    }

    function D(data, ax, ya) {
        const L = [];
        const aOuter = data[ax - 1].outer;
        let b = [ax, ya, Z(data, ax, ya)];
        let rowInner = null;
        let step = 1;

        while (true) {
            if (step === 1) {
                if (b[1] === 0 && b[2] === 1) step = 9;
                else step = 2;
            } else if (step === 2) {
                const xb = b[0], yb = b[1];
                const maxH = data[xb - 1].inner.length;
                step = yb === maxH ? 3 : 7;
            } else if (step === 3) {
                const outerB = data[b[0] - 1].outer;
                step = outerB < aOuter ? 10 : 6;
            } else if (step === 4) {
                const outerB = data[b[0] - 1].outer;
                step = outerB < aOuter - 1 ? 11 : 5;
            } else if (step === 5) {
                L.unshift([...b]);
                rowInner = 'exist';
                step = 6;
            } else if (step === 6) {
                try {
                    P(data, b[0], b[1]);
                    step = 7;
                } catch {
                    step = 8;
                }
            } else if (step === 7) {
                b = P(data, b[0], b[1]);
                step = 1;
            } else if (step === 8) {
                b = PP(data, b[0], b[1]);
                rowInner = null;
                step = 1;
            } else if (step === 9) {
                L.unshift([...b]);
                step = 11;
            } else if (step === 10) {
                step = rowInner === 'exist' ? 6 : 4;
            } else if (step === 11) {
                break;
            }
        }

        return L;
    }

    let globalOI = [];
    let globalPI = [];
    let globalMI = [];

    function resetBDGlobals() {
        globalOI = [];
        globalPI = [];
        globalMI = [];
    }

    function M(data, a) {
        const OI = [];
        const PI = [];
        const MI = [];

        const xa = a[0];
        const ya = a[1];
        let b = [...a];
        let c = data[b[0] - 1] || null;
        let step = 0;

        while (true) {
            if (step === 0) {
                step = (b[1] === 0 && b[2] === 1) ? 15 : 1;
            } else if (step === 1) {
                let ppb = null;
                try {
                    ppb = PP(data, b[0], b[1]);
                    step = bdSameTriple(ppb, a) ? 14 : 3;
                } catch {
                    step = 4;
                }
            } else if (step === 3) {
                let ppb = PP(data, b[0], b[1]);
                step = bdTripleInList(ppb, OI) ? 14 : 4;
            } else if (step === 4) {
                let pb = null;
                try {
                    pb = P(data, b[0], b[1]);
                    step = 5;
                } catch {
                    step = 7;
                }
            } else if (step === 5) {
                let upa = null;
                try { upa = UP(data, a[0], a[1]); } catch {}
                const pb = P(data, b[0], b[1]);
                step = upa && bdSameTriple(pb, upa) ? 14 : 6;
            } else if (step === 6) {
                const pb = P(data, b[0], b[1]);
                step = bdTripleInList(pb, OI) ? 14 : 7;
            } else if (step === 7) {
                try {
                    const upb = UP(data, b[0], b[1]);
                    if (
                        c &&
                        upb[1] <= c.inner.length &&
                        c.inner[upb[1] - 1] === upb[2]
                    ) {
                        step = 13;
                    } else {
                        step = 8;
                    }
                } catch {
                    step = 8;
                }
            } else if (step === 8) {
                try {
                    RT(data, b);
                    step = 10;
                } catch {
                    step = 16;
                }
            } else if (step === 9) {
                step = c && ya + 1 <= c.inner.length ? 11 : 12;
            } else if (step === 10) {
                try {
                    c = RT(data, b);
                    step = 9;
                } catch {
                    step = 16;
                }
            } else if (step === 11) {
                const nx = b[0] + 1;
                const ny = ya + 1;
                const nv = c.inner[ya];
                b = [nx, ny, nv];
                step = 1;
            } else if (step === 12) {
                if (c && c.inner.length >= 1) {
                    const nx = b[0] + 1;
                    b = [nx, 1, c.inner[0]];
                    step = 8;
                } else {
                    step = 16;
                }
            } else if (step === 13) {
                try {
                    b = UP(data, b[0], b[1]);
                    step = 1;
                } catch {
                    step = 16;
                }
            } else if (step === 14) {
                OI.push([...b]);
                step = 7;
            } else if (step === 15) {
                for (let i = xa; i <= data.length; i++) {
                    const it = data[i - 1];
                    for (let h = 1; h <= it.inner.length; h++) {
                        OI.push([i, h, it.inner[h - 1]]);
                    }
                }
                step = 16;
            } else if (step === 16) {
                break;
            }
        }

        if (a[1] === 0 && a[2] === 1) {
            for (let i = xa; i <= data.length; i++) {
                const it = data[i - 1];
                if (it.inner.length >= 1) {
                    PI.push([i, 1, it.inner[0]]);
                }
            }
        } else {
            for (const it of OI) {
                if (it[1] === ya + 1) PI.push(it);
            }

            for (let i = xa; i <= data.length; i++) {
                const obj = data[i - 1];
                for (let h = 1; h <= obj.inner.length; h++) {
                    const cand = [i, h, obj.inner[h - 1]];
                    if (!bdTripleInList(cand, OI)) MI.push(cand);
                }
            }
        }

        globalOI = OI;
        globalPI = PI;
        globalMI = MI;

        return [OI, PI, MI];
    }

    function OIGet(x, y) {
        return globalOI.find(it => it[0] === x && it[1] === y) || null;
    }

    function PIGet(x) {
        return globalPI.find(it => it[0] === x) || null;
    }

    function MIGet(x, y) {
        return globalMI.find(it => it[0] === x && it[1] === y) || null;
    }

    function plusTriple(A, n) {
        return [A[0], A[1], A[2] + n];
    }

    function buildMPO(k, a, data, xb, yb) {
        const xa = a[0];
        const ya = a[1];
        const nx = xb - xa + 1;
        const ny = yb - ya;

        const mp = new Map();

        for (let cc = xa + 1; cc <= xb; cc++) {
            mp.set(cc, {
                inner: [],
                outer: data[cc - 1].outer
            });
        }

        let cc = xa + 1;
        let d = 1;
        let step = 1;

        while (true) {
            if (step === 1) {
                if (cc > xb) break;
                step = 2;
            } else if (step === 2) {
                const mi = MIGet(cc, d);
                step = mi ? 3 : 7;
            } else if (step === 3) {
                const mi = MIGet(cc, d);
                mp.get(cc).inner.push(mi[2] < xa ? mi[2] : plusTriple(mi, k * (nx - 1))[2]);
                step = 4;
            } else if (step === 4) {
                try {
                    const up = UP(data, cc, d);
                    step = bdTripleInList(up, globalMI) ? 5 : 6;
                } catch {
                    step = 6;
                }
            } else if (step === 5) {
                d++;
                step = 2;
            } else if (step === 6) {
                d++;
                step = 7;
            } else if (step === 7) {
                let oi = OIGet(cc, d);
                if (!oi && cc <= data.length && d <= data[cc - 1].inner.length) {
                    oi = [cc, d, data[cc - 1].inner[d - 1]];
                }
                step = oi ? 8 : 12;
            } else if (step === 8) {
                const pi = PIGet(cc);
                if (pi) {
                    for (let i = 0; i < k * ny; i++) {
                        mp.get(cc).inner.push(plusTriple(pi, k * (nx - 1))[2]);
                    }
                }
                step = 9;
            } else if (step === 9) {
                let oi = OIGet(cc, d);
                if (!oi && cc <= data.length && d <= data[cc - 1].inner.length) {
                    oi = [cc, d, data[cc - 1].inner[d - 1]];
                }

                mp.get(cc).inner.push(oi[2] < xa ? oi[2] : plusTriple(oi, k * (nx - 1))[2]);
                step = 10;
            } else if (step === 10) {
                try {
                    const up = UP(data, cc, d);
                    step = bdTripleInList(up, globalOI) ? 11 : 12;
                } catch {
                    step = 12;
                }
            } else if (step === 11) {
                d++;
                step = 9;
            } else if (step === 12) {
                d = 1;
                cc++;
                step = 1;
            }
        }

        const out = [];
        for (let x = xa + 1; x <= xb; x++) {
            out.push(mp.get(x));
        }

        return out;
    }

    function BD(n, originalData, L, xb, yb, c) {
        if (!L || L.length === 0) {
            throw new Error('BD: L 为空');
        }

        const S1 = bdClone(originalData);
        let S2 = bdClone(originalData);
        let S3 = [];

        let k = 1;
        let e = null;
        let p = null;
        let a = L[L.length - 1];
        let idxA = L.length - 1;
        let step = 0;
        let xVal = 0;

        while (true) {
            if (step === 0) {
                if (a[1] === 0 && a[2] === 1) return a;
                step = 1;
            } else if (step === 1) {
                if (L.length === 1 && bdTripleInList(a, L)) return a;
                step = 2;
            } else if (step === 2) {
                S2[S2.length - 1].outer = originalData[a[0] - 1].outer;
                step = 3;
            } else if (step === 3) {
                M(originalData, a);
                const newItems = buildMPO(1, a, S2, xb, yb);
                step = 4;
                S2._newItems = newItems;
            } else if (step === 4) {
                S2.push(...S2._newItems);
                delete S2._newItems;
                step = 5;
            } else if (step === 5) {
                S2[S2.length - 1].outer = c;
                step = 6;
            } else if (step === 6) {
                idxA = L.findIndex(x => bdSameTriple(x, a));
                if (idxA < 0) throw new Error('BD: a 不在 L 中');
                step = idxA === 0 ? 16 : 7;
            } else if (step === 7) {
                a = L[idxA - 1];
                idxA--;
                step = 8;
            } else if (step === 8) {
                S3 = bdClone(S1);
                step = 9;
            } else if (step === 9) {
                S3[S3.length - 1].outer = originalData[a[0] - 1].outer;
                step = 10;
            } else if (step === 10) {
                M(originalData, a);
                S3._newItems = buildMPO(1, a, S3, xb, yb);
                step = 11;
            } else if (step === 11) {
                S3.push(...S3._newItems);
                delete S3._newItems;
                step = 12;
            } else if (step === 12) {
                S3[S3.length - 1].outer = c;
                step = 13;
            } else if (step === 13) {
                xVal = 1;
                step = 14;
            } else if (step === 14) {
                const res = S(itemAt(S2, xVal), itemAt(S3, xVal));
                if (res === itemAt(S2, xVal)) step = 6;
                else if (res === itemAt(S3, xVal)) {
                    p = a;
                    step = 15;
                } else if (res === 'equal') {
                    step = 23;
                } else {
                    return null;
                }
            } else if (step === 15) {
                if (idxA + 1 < L.length) {
                    a = L[idxA + 1];
                    idxA++;
                }
                step = 16;
            } else if (step === 16) {
                S3 = bdClone(S1);
                step = 17;
            } else if (step === 17) {
                S3[S3.length - 1].outer = originalData[a[0] - 1].outer;
                step = 18;
            } else if (step === 18) {
                M(originalData, a);
                S3._newItems = buildMPO(1, a, S3, xb, yb);
                step = 19;
            } else if (step === 19) {
                S3.push(...S3._newItems);
                delete S3._newItems;
                step = 20;
            } else if (step === 20) {
                S3[S3.length - 1].outer = c;
                step = 21;
            } else if (step === 21) {
                xVal = 1;
                step = 22;
            } else if (step === 22) {
                const res = S(itemAt(S2, xVal), itemAt(S3, xVal));
                if (res === itemAt(S2, xVal)) step = 25;
                else if (res === itemAt(S3, xVal)) step = 26;
                else if (res === 'equal') step = 24;
                else return null;
            } else if (step === 23) {
                const nextS2 = xVal + 1 <= S2.length ? itemAt(S2, xVal + 1) : null;
                const nextS3 = xVal + 1 <= S3.length ? itemAt(S3, xVal + 1) : null;

                if (nextS2 && !nextS3) step = 15;
                else if (!nextS2 && nextS3) step = 6;
                else if (nextS2 && nextS3) {
                    xVal++;
                    step = 14;
                } else {
                    step = 15;
                }
            } else if (step === 24) {
                const nextS2 = xVal + 1 <= S2.length ? itemAt(S2, xVal + 1) : null;
                const nextS3 = xVal + 1 <= S3.length ? itemAt(S3, xVal + 1) : null;

                if (nextS2 && !nextS3) step = 26;
                else if (!nextS2 && nextS3) step = 25;
                else if (nextS2 && nextS3) {
                    xVal++;
                    step = 22;
                } else {
                    step = 25;
                }
            } else if (step === 25) {
                S2 = bdClone(S3);
                S3 = bdClone(S1);
                e = a;
                step = 26;
            } else if (step === 26) {
                if (idxA === L.length - 1) {
                    step = 27;
                } else {
                    if (idxA + 1 < L.length) {
                        a = L[idxA + 1];
                        idxA++;
                    }
                    step = 15;
                }
            } else if (step === 27) {
                k++;
                if (k === n) return e || a;
                a = p;
                S2 = bdClone(S1);
                S3 = [];
                step = 2;
            }
        }
    }

    function sequenceDetail(Sq) {
        if (!Sq || Sq.length === 0) return Sq;

        const newSeq = bdClone(Sq);
        const a = newSeq[newSeq.length - 1];
        const inner = a.inner;
        const outer = a.outer;

        if (inner.length === 0 && outer === 1) {
            newSeq.pop();
            return newSeq;
        }

        const hVal = inner[inner.length - 1];

        if (hVal < 1 || hVal > newSeq.length) {
            throw new Error('最高内项的值超出序列范围');
        }

        const b = newSeq[hVal - 1];

        if (outer === 1) {
            if (b.inner.length === 0 && b.outer === 1) {
                newSeq[newSeq.length - 1] = { inner: [], outer: 1 };
            } else {
                const bHeight = b.inner.length;
                const aHeight = inner.length;

                if (bHeight === aHeight - 1) {
                    newSeq[newSeq.length - 1] = {
                        inner: inner.slice(0, -1),
                        outer: b.outer
                    };
                } else {
                    const newInner = inner.slice(0, -1);
                    const newAHeight = newInner.length;

                    if (newAHeight < b.inner.length) {
                        newInner.push(...b.inner.slice(newAHeight));
                    }

                    newSeq[newSeq.length - 1] = {
                        inner: newInner,
                        outer: b.outer
                    };
                }
            }
        } else {
            if (b.inner.length === 0 && b.outer === 1) {
                newSeq[newSeq.length - 1] = {
                    inner: [...inner],
                    outer: 1
                };
            } else {
                newSeq[newSeq.length - 1] = {
                    inner: [...inner],
                    outer: outer - 1
                };
            }
        }

        return newSeq;
    }

    function applyModificationOriginal(slice, h, d, multiplier) {
        return slice.map(item => ({
            inner: item.inner.map(num => num >= h ? num + d * multiplier : num),
            outer: item.outer
        }));
    }

    function applyModificationSpecial1(slice, d, multiplier) {
        return slice.map(item => ({
            inner: item.inner.length === 0
                ? []
                : item.inner.map(num => num + d * multiplier),
            outer: item.outer
        }));
    }

    function processSequence(data) {
        if (!data || data.length === 0) return { newData: data, stateInfo: null };

        const last = data[data.length - 1];
        const inner = last.inner;
        const outer = last.outer;

        if (inner.length === 0 && outer === 1) {
            return {
                newData: data,
                stateInfo: null
            };
        }

        if (inner.length > 0 && outer === 1) {
            const n = inner.length;
            const hVal = inner[inner.length - 1];

            if (hVal < 1 || hVal > data.length) {
                throw new Error('最高内项的值超出序列范围');
            }

            const target = data[hVal - 1];
            const tHeight = target.inner.length;
            const targetOuter = target.outer;

            if (n === tHeight + 1) {
                const d = data.length - hVal;
                const newLastInner = inner.slice(0, -1);

                const newData = data.slice(0, -1).map(x => ({
                    inner: [...x.inner],
                    outer: x.outer
                }));

                newData.push({
                    inner: newLastInner,
                    outer: targetOuter
                });

                const baseSlice = newData.slice(hVal);

                let modified;
                let mode;

                if (target.inner.length === 0 && target.outer === 1) {
                    modified = applyModificationSpecial1(baseSlice, d, 1);
                    mode = 'special1';
                } else {
                    modified = applyModificationOriginal(baseSlice, hVal, d, 1);
                    mode = 'original';
                }

                return {
                    newData: newData.concat(modified),
                    stateInfo: ['middle', baseSlice, hVal, d, mode]
                };
            }

            if (n <= tHeight) {
                const d = data.length - hVal;
                const newLastInner = inner.slice(0, -1);
                const aLen = newLastInner.length;

                if (aLen < target.inner.length) {
                    newLastInner.push(...target.inner.slice(aLen));
                }

                const newData = data.slice(0, -1).map(x => ({
                    inner: [...x.inner],
                    outer: x.outer
                }));

                newData.push({
                    inner: newLastInner,
                    outer: targetOuter
                });

                const baseSlice = newData.slice(hVal);
                const modified = applyModificationOriginal(baseSlice, hVal, d, 1);

                return {
                    newData: newData.concat(modified),
                    stateInfo: ['middle', baseSlice, hVal, d, 'original']
                };
            }

            throw new Error('非法序列');
        }

        const xb = data.length;
        const yb = inner.length;
        const nVal = outer;
        const cVal = outer;
        const original = bdClone(data);

        const L = D(data, xb, yb);
        const a = BD(nVal, original, L, xb, yb, cVal);

        if (!a) throw new Error('BD 返回 None');

        const newLastOuter = original[a[0] - 1].outer;

        const modifiedData = original.slice(0, -1).map(x => ({
            inner: [...x.inner],
            outer: x.outer
        }));

        modifiedData.push({
            inner: [...inner],
            outer: newLastOuter
        });

        M(original, a);

        const modifiedSlice = buildMPO(1, a, modifiedData, xb, yb);

        return {
            newData: modifiedData.concat(modifiedSlice),
            stateInfo: ['long', modifiedData, a, xb, yb]
        };
    }

    function bdFindBadRootIndex(seq) {
        if (!seq || seq.length === 0) return -1;
    
        const data = bdClone(seq);
        const last = data[data.length - 1];
    
        // 后继：单独 1，没有坏根
        if (last.inner.length === 0 && last.outer === 1) {
            return -1;
        }
    
        // 括号外等于 1：
        // 括号内最右侧数字对应项为坏根
        if (last.outer === 1) {
            if (last.inner.length === 0) return -1;
    
            const h = last.inner[last.inner.length - 1];
    
            return h >= 1 && h <= data.length ? h - 1 : -1;
        }
    
        // 括号外大于 1：
        // 原程序逻辑：
        // L = D(data, xb, yb)
        // a = BD(outer, data, L, xb, yb, outer)
        // 坏根项 = a[0]
        if (last.outer > 1) {
            try {
                resetBDGlobals();
    
                const xb = data.length;
                const yb = last.inner.length;
                const nVal = last.outer;
                const cVal = last.outer;
    
                const original = bdClone(data);
                const L = D(data, xb, yb);
    
                if (!L || L.length === 0) return -1;
    
                const a = BD(nVal, original, L, xb, yb, cVal);
    
                if (!a) return -1;
    
                const index = a[0] - 1;
    
                return index >= 0 && index < data.length ? index : -1;
            } catch {
                return -1;
            }
        }
    
        return -1;
    }

    function bdExpandCore(data, steps) {
        resetBDGlobals();
    
        const original = bdClone(data);
    
        if (original.length === 0) {
            return {
                result: [],
                goodLength: 0,
                groups: [],
                badRootIndex: -1
            };
        }
    
        const badRootIndex = bdFindBadRootIndex(original);
    
        // 后继序数：单独 1，删除末项
        const last = original[original.length - 1];
        if (last.inner.length === 0 && last.outer === 1) {
            const result = original.slice(0, -1);
    
            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex: -1
            };
        }
    
        // times = 0 时，按 detail 展开一步，不做蓝绿分组
        if (steps <= 0) {
            const result = sequenceDetail(original);
    
            return {
                result,
                goodLength: result.length,
                groups: [],
                badRootIndex
            };
        }
    
        const first = processSequence(original);
        let lastOutput = first.newData;
    
        // 关键：
        // BDHM 的原始前缀只到原末项之前。
        // 原末项被替换后的那一项，应该算作第一块蓝色的第一项。
        const goodLength = Math.max(original.length - 1, 0);
    
        const groups = [];
    
        // 对用于显示/分组的累计结果统一去掉末尾一项
        function visible(seq) {
            if (!seq || seq.length === 0) return [];
            return seq.slice(0, -1);
        }
    
        let prevVisibleLength = goodLength;
    
        let visibleNow = visible(lastOutput);
        groups.push(visibleNow.slice(prevVisibleLength));
        prevVisibleLength = visibleNow.length;
    
        let middleState = null;
        let longState = null;
    
        if (first.stateInfo) {
            if (first.stateInfo[0] === 'middle') {
                const [, baseSlice, hVal, d, modeType] = first.stateInfo;
    
                middleState = {
                    baseSlice,
                    hVal,
                    d,
                    modeType,
                    multiplier: 1
                };
            } else {
                const [, origData, a, xb, yb] = first.stateInfo;
    
                longState = {
                    origData,
                    a,
                    xb,
                    yb,
                    k: 1
                };
            }
        }
    
        for (let step = 1; step < steps; step++) {
            let newItems = [];
    
            if (middleState) {
                middleState.multiplier++;
    
                if (middleState.modeType === 'special1') {
                    newItems = applyModificationSpecial1(
                        middleState.baseSlice,
                        middleState.d,
                        middleState.multiplier
                    );
                } else {
                    newItems = applyModificationOriginal(
                        middleState.baseSlice,
                        middleState.hVal,
                        middleState.d,
                        middleState.multiplier
                    );
                }
    
                lastOutput = lastOutput.concat(newItems);
            } else if (longState) {
                longState.k++;
    
                newItems = buildMPO(
                    longState.k,
                    longState.a,
                    longState.origData,
                    longState.xb,
                    longState.yb
                );
    
                lastOutput = lastOutput.concat(newItems);
            } else {
                break;
            }
    
            visibleNow = visible(lastOutput);
    
            const group = visibleNow.slice(prevVisibleLength);
            groups.push(group);
    
            prevVisibleLength = visibleNow.length;
        }
    
        const result = visible(lastOutput);
    
        return {
            result,
            goodLength,
            groups,
            badRootIndex
        };
    }

    function bdCountString(seq) {
        let n = 1;
        const C = [];
        let current = bdClone(seq);

        while (true) {
            const prevLen = current.length;
            current = sequenceDetail(current);

            if (current.length === prevLen) {
                n++;
            } else {
                C.unshift(n);
                n = 1;
            }

            if (!current || current.length === 0) break;
        }

        return C.join(',');
    }

    function makeBDHMLimitToken(n) {
        // n = 1 -> 1
        if (n === 1) {
            return {
                inner: [],
                outer: 1
            };
        }
    
        // n = 2 -> (1)2
        // n = 3 -> (2,2)3
        // n = 4 -> (3,3,3)4
        return {
            inner: Array(n - 1).fill(n - 1),
            outer: n
        };
    }

    registerNotation({
        id: 'BDHM',
        name: 'BDHM',
        placeholder: '例如：1,(1)2,(2,2)3',
        defaultTimes: 3,
        lexDesc: true,

        parse(input) {
            return bdParse(input);
        },

        format(seq) {
            if (!seq || seq.length === 0) return '';
            return bdFormatSequence(seq);
        },

        formatToken(token) {
            return bdFormatItem(token);
        },

        separator(curr, next) {
            return ',';
        },

        compareSeq(a, b) {
            const sa = bdFormatSequence(a);
            const sb = bdFormatSequence(b);
            return sa.localeCompare(sb, 'zh-CN', { numeric: true });
        },

        getBadRootIndex(seq) {
            try {
                return bdFindBadRootIndex(seq);
            } catch {
                return -1;
            }
        },

        isSuccessor(seq) {
            if (!seq || seq.length === 0) return true;
            const last = seq[seq.length - 1];
            return last.inner.length === 0 && last.outer === 1;
        },

        countStep(seq) {
            const expanded = bdExpandCore(seq, 1);
        
            if (!expanded || !expanded.result) {
                return seq;
            }
        
            const result = expanded.result;
        
            if (result.length < seq.length) {
                return result;
            }
        
            const nextLast = result[seq.length - 1];
        
            if (!nextLast) {
                return result;
            }
        
            return seq.slice(0, -1).concat([nextLast]);
        },

        expand(seq, times) {
            return bdExpandCore(seq, times);
        },

        limit: {
            initial() {
                return [
                    makeBDHMLimitToken(1),
                    makeBDHMLimitToken(2),
                    makeBDHMLimitToken(3)
                ];
            },
        
            extend(seq) {
                return [
                    ...seq,
                    makeBDHMLimitToken(seq.length + 1)
                ];
            },
        
            // 截取式：点击第 index 项，取前 index + 1 项
            select(seq, index) {
                return seq.slice(0, index + 1);
            }
        }
    });
})();