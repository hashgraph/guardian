type Position = readonly number[];

interface Segment {
    index: number;
    ring: number;
    previous: number;
    next: number;
    start: Position;
    end: Position;
}

interface SweepNode {
    segment: Segment;
    height: number;
    parent: SweepNode | null;
    left: SweepNode | null;
    right: SweepNode | null;
}

function cross(a: Position, b: Position, c: Position): number {
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a: Position, b: Position, point: Position): boolean {
    return point[0] >= Math.min(a[0], b[0]) && point[0] <= Math.max(a[0], b[0]) &&
        point[1] >= Math.min(a[1], b[1]) && point[1] <= Math.max(a[1], b[1]);
}

function intersects(first: Segment, second: Segment): boolean {
    const a = cross(first.start, first.end, second.start);
    const b = cross(first.start, first.end, second.end);
    const c = cross(second.start, second.end, first.start);
    const d = cross(second.start, second.end, first.end);
    if (((a < 0 && b > 0) || (a > 0 && b < 0)) &&
        ((c < 0 && d > 0) || (c > 0 && d < 0))) {
        return true;
    }
    return (a === 0 && onSegment(first.start, first.end, second.start)) ||
        (b === 0 && onSegment(first.start, first.end, second.end)) ||
        (c === 0 && onSegment(second.start, second.end, first.start)) ||
        (d === 0 && onSegment(second.start, second.end, first.end));
}

function comparePositions(first: Position, second: Position): number {
    return first[0] - second[0] || first[1] - second[1];
}

function compareSegments(first: Segment, second: Segment): number {
    if (first.index === second.index) return 0;
    if (first.start[0] === second.start[0]) {
        const difference = first.start[1] - second.start[1];
        if (difference) return difference;
        const orientation = cross(first.start, first.end, second.end);
        return orientation > 0 ? -1 : orientation < 0 ? 1 : first.index - second.index;
    }
    if (first.start[0] > second.start[0]) return -compareSegments(second, first);
    const orientation = cross(first.start, first.end, second.start) ||
        cross(first.start, first.end, second.end);
    return orientation > 0 ? -1 : orientation < 0 ? 1 : first.index - second.index;
}

class SweepStatus {
    private root: SweepNode | null = null;
    private readonly nodes: (SweepNode | undefined)[] = [];

    private height(node: SweepNode | null): number {
        return node?.height || 0;
    }

    private update(node: SweepNode): void {
        node.height = 1 + Math.max(this.height(node.left), this.height(node.right));
    }

    private replace(node: SweepNode, replacement: SweepNode | null): void {
        if (!node.parent) this.root = replacement;
        else if (node.parent.left === node) node.parent.left = replacement;
        else node.parent.right = replacement;
        if (replacement) replacement.parent = node.parent;
    }

    private rotate(node: SweepNode, left: boolean): SweepNode {
        const next = (left ? node.right : node.left)!;
        const middle = left ? next.left : next.right;
        this.replace(node, next);
        if (left) {
            next.left = node;
            node.right = middle;
        } else {
            next.right = node;
            node.left = middle;
        }
        node.parent = next;
        if (middle) middle.parent = node;
        this.update(node);
        this.update(next);
        return next;
    }

    private balance(node: SweepNode | null): void {
        while (node) {
            this.update(node);
            const difference = this.height(node.left) - this.height(node.right);
            if (difference > 1) {
                const child = node.left!;
                if (this.height(child.left) < this.height(child.right)) this.rotate(child, true);
                node = this.rotate(node, false);
            } else if (difference < -1) {
                const child = node.right!;
                if (this.height(child.right) < this.height(child.left)) this.rotate(child, false);
                node = this.rotate(node, true);
            }
            node = node.parent;
        }
    }

    public neighbor(node: SweepNode, next: boolean): SweepNode | null {
        let branch = next ? node.right : node.left;
        if (branch) {
            while (next ? branch.left : branch.right) branch = (next ? branch.left : branch.right)!;
            return branch;
        }
        let parent = node.parent;
        while (parent && (next ? parent.right === node : parent.left === node)) {
            node = parent;
            parent = parent.parent;
        }
        return parent;
    }

    public insert(segment: Segment): SweepNode {
        let parent: SweepNode | null = null;
        let current = this.root;
        let order = 0;
        while (current) {
            parent = current;
            order = compareSegments(segment, current.segment);
            current = order < 0 ? current.left : current.right;
        }
        const node: SweepNode = { segment, height: 1, parent, left: null, right: null };
        if (!parent) this.root = node;
        else if (order < 0) parent.left = node;
        else parent.right = node;
        this.nodes[segment.index] = node;
        this.balance(parent);
        return node;
    }

    public find(segment: Segment): SweepNode {
        return this.nodes[segment.index]!;
    }

    public remove(node: SweepNode): void {
        this.nodes[node.segment.index] = undefined;
        if (node.left && node.right) {
            const successor = this.neighbor(node, true)!;
            node.segment = successor.segment;
            this.nodes[node.segment.index] = node;
            node = successor;
        }
        const parent = node.parent;
        this.replace(node, node.left || node.right);
        this.balance(parent);
    }
}

function findCrossing(rings: Position[][]): [Segment, Segment] | null {
    const segments: Segment[] = [];
    rings.forEach((points, ring) => {
        const offset = segments.length;
        points.forEach((point, position) => {
            const following = points[(position + 1) % points.length];
            const index = offset + position;
            const previous = offset + (position + points.length - 1) % points.length;
            const next = offset + (position + 1) % points.length;
            segments.push(comparePositions(point, following) < 0
                ? { index, ring, previous, next, start: point, end: following }
                : { index, ring, previous, next, start: following, end: point });
        });
    });
    const events = segments.flatMap(segment => [
        { point: segment.start, segment, start: true },
        { point: segment.end, segment, start: false },
    ]);
    events.sort((a, b) => comparePositions(a.point, b.point) ||
        Number(a.start) - Number(b.start) || compareSegments(a.segment, b.segment));
    const status = new SweepStatus();
    const crosses = (first: SweepNode | null, second: SweepNode | null): [Segment, Segment] | null => {
        if (!first || !second) return null;
        return first.segment.index !== second.segment.previous &&
            first.segment.index !== second.segment.next &&
            intersects(first.segment, second.segment) ? [first.segment, second.segment] : null;
    };
    for (const event of events) {
        const node = event.start ? status.insert(event.segment) : status.find(event.segment);
        const previous = status.neighbor(node, false);
        const next = status.neighbor(node, true);
        const found = crosses(previous, node) || crosses(node, next);
        if (found) return found;
        if (!event.start) {
            status.remove(node);
            const after = crosses(previous, next);
            if (after) return after;
        }
    }
    return null;
}

function hasCrossing(points: Position[]): boolean {
    return findCrossing([points]) !== null;
}

function normalizeRing(ring: readonly Position[]): number[][] {
    const points: number[][] = [];
    for (const coordinate of ring) {
        let longitude = coordinate[0];
        const previous = points[points.length - 1];
        if (previous) {
            while (longitude - previous[0] > 180) longitude -= 360;
            while (longitude - previous[0] < -180) longitude += 360;
            if (longitude === previous[0] && coordinate[1] === previous[1]) continue;
        }
        points.push([longitude, coordinate[1]]);
    }
    if (points.length > 1 && points[0][0] === points[points.length - 1][0] &&
        points[0][1] === points[points.length - 1][1]) {
        points.pop();
    }
    return points;
}

function alignRing(points: number[][], reference: number): number[][] {
    let shift = 0;
    while (points[0][0] + shift - reference > 180) shift -= 360;
    while (points[0][0] + shift - reference < -180) shift += 360;
    return shift ? points.map(([longitude, latitude]) => [longitude + shift, latitude]) : points;
}

function contains(ring: Position[], point: Position): boolean {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index++) {
        const a = ring[previous];
        const b = ring[index];
        if ((a[1] > point[1]) !== (b[1] > point[1])) {
            const side = cross(a, b, point);
            if (b[1] > a[1] ? side > 0 : side < 0) inside = !inside;
        }
    }
    return inside;
}

export function polygonRingError(ring: readonly Position[]): string | null {
    const points = normalizeRing(ring);
    if (points.length < 3) return 'must contain at least 3 distinct points';
    const positions = new Set(points.map(point => point[0] + '|' + point[1]));
    if (positions.size !== points.length) return 'must not repeat a point except to close the ring';

    for (let index = 0; index < points.length; index++) {
        const a = points[(index + points.length - 1) % points.length];
        const b = points[index];
        const c = points[(index + 1) % points.length];
        if (cross(a, b, c) === 0 &&
            (a[0] - b[0]) * (c[0] - b[0]) + (a[1] - b[1]) * (c[1] - b[1]) > 0) {
            return 'must not contain overlapping edges';
        }
    }
    if (hasCrossing(points)) return 'must not cross or touch itself';
    const origin = points[0];
    const area = points.reduce((sum, point, index) => {
        const next = points[(index + 1) % points.length];
        return sum + (point[0] - origin[0]) * (next[1] - origin[1]) -
            (next[0] - origin[0]) * (point[1] - origin[1]);
    }, 0);
    return area === 0 ? 'must enclose a nonzero area' : null;
}

export function polygonHolesError(rings: readonly (readonly Position[])[]): string | null {
    if (rings.length < 2) return null;
    const shell = normalizeRing(rings[0]);
    const normalized = rings.map((ring, index) => index ? alignRing(normalizeRing(ring), shell[0][0]) : shell);
    const owners = new Map<string, number>();
    for (let ring = 0; ring < normalized.length; ring++) {
        for (const point of normalized[ring]) {
            const key = point[0] + '|' + point[1];
            const owner = owners.get(key);
            if (owner !== undefined && owner !== ring) return `ring #${ring} must not cross or touch ring #${owner}`;
            owners.set(key, ring);
        }
    }
    const crossing = findCrossing(normalized);
    if (crossing) {
        const [first, second] = [crossing[0].ring, crossing[1].ring].sort((a, b) => a - b);
        return `ring #${second} must not cross or touch ring #${first}`;
    }
    for (let hole = 1; hole < normalized.length; hole++) {
        if (!contains(normalized[0], normalized[hole][0])) return `ring #${hole} must lie inside ring #0`;
    }
    for (let hole = 1; hole < normalized.length; hole++) {
        for (let other = 1; other < normalized.length; other++) {
            if (other !== hole && contains(normalized[other], normalized[hole][0])) {
                return `ring #${hole} must not lie inside ring #${other}`;
            }
        }
    }
    return null;
}
