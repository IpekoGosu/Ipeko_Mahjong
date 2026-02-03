import Riichi from 'riichi';

export class SimpleAI {
    /**
     * Decides which tile to discard to minimize Shanten.
     * @param handTiles Array of tile strings (e.g. ["1m", "5z", ...])
     */
    static decideDiscard(handTiles: string[]): string {
        if (handTiles.length === 0) return '';
        
        let bestDiscard = handTiles[handTiles.length - 1]; // Default to last drawn
        let minShanten = 100;

        // Try discarding each unique tile
        const uniqueTiles = Array.from(new Set(handTiles));

        for (const tile of uniqueTiles) {
            // Create a 13-tile hand string by removing one instance of this tile
            const remainingTiles = [...handTiles];
            const idx = remainingTiles.indexOf(tile);
            if (idx > -1) remainingTiles.splice(idx, 1);
            
            const handStr = this.convertTilesToString(remainingTiles);
            const result = new Riichi(handStr).calc();
            
            // syanten is the standard property for shanten in this library
            const shanten = (result as any).syanten;

            // Prioritize discard that gives lower shanten.
            // If tie, we stick with current (or could add logic to keep terminals/dora)
            if (shanten < minShanten) {
                minShanten = shanten;
                bestDiscard = tile;
            }
        }

        return bestDiscard;
    }

    private static convertTilesToString(tiles: string[]): string {
        // Convert ["1m", "2m", "1p"] to "12m1p"
        const groups: Record<string, number[]> = { m: [], p: [], s: [], z: [] };
        tiles.forEach(t => {
            const rank = parseInt(t[0]);
            const suit = t[1];
            if (groups[suit]) groups[suit].push(rank);
        });
        
        let result = "";
        ['m', 'p', 's', 'z'].forEach(suit => {
            if (groups[suit].length > 0) {
                groups[suit].sort((a,b) => a - b);
                result += groups[suit].join('') + suit;
            }
        });
        return result;
    }
}
