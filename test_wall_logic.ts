import { Wall } from './IpekoMahjong_Backend/src/modules/mahjong/classes/wall.class';
import { Tile } from './IpekoMahjong_Backend/src/modules/mahjong/classes/tile.class';

function testWall() {
    console.log('--- Starting Wall Test ---');
    const wall = new Wall();
    wall.shuffle();
    wall.separateDeadWall();
    wall.revealDora();

    console.log(`Initial Wall Count: ${wall.getRemainingTiles()}`);
    console.log(`Initial Dead Wall Count: ${wall.getRemainingDeadWall()}`); // Should be 14
    console.log(`Initial Dora Count: ${wall.getDora().length}`); // Should be 1 (index 4)

    // Simulate Kan
    console.log('\n--- Simulating Kan 1 ---');
    const replacement1 = wall.drawReplacement();
    console.log(`Drawn Replacement: ${replacement1?.toString()}`);
    
    console.log(`Wall Count after Kan 1: ${wall.getRemainingTiles()}`); // Should decrease by 1 (replenished dead wall)
    console.log(`Dead Wall Count after Kan 1: ${wall.getRemainingDeadWall()}`); // Should still be 14
    
    wall.revealDora();
    console.log(`Dora Count after Kan 1: ${wall.getDora().length}`); // Should be 2
    
    // Simulate Kan 2
    console.log('\n--- Simulating Kan 2 ---');
    const replacement2 = wall.drawReplacement();
    console.log(`Drawn Replacement: ${replacement2?.toString()}`);
    
    console.log(`Wall Count after Kan 2: ${wall.getRemainingTiles()}`);
    console.log(`Dead Wall Count after Kan 2: ${wall.getRemainingDeadWall()}`);
    
    wall.revealDora();
    console.log(`Dora Count after Kan 2: ${wall.getDora().length}`); // Should be 3

    // Check Uradora
    const uradora = wall.getUradora();
    console.log(`\nUradora Count: ${uradora.length}`); // Should be 3
    console.log(`Uradora Tiles: ${uradora.map(t => t.toString()).join(', ')}`);

    if (wall.getRemainingDeadWall() === 14) {
        console.log('\nSUCCESS: Dead Wall maintained at 14.');
    } else {
        console.error('\nFAILURE: Dead Wall count is correct.');
    }
}

testWall();
