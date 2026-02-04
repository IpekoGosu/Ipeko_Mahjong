// Riichi Library test file
const Riichi = require('riichi')

try {
    console.log('Testing Shanten for Tenpai...')

    const tenpai13 = '123m456p789s1122z'
    const res1 = new Riichi(tenpai13).calc()
    console.log('13 tiles Result:', JSON.stringify(res1, null, 2))
} catch (e) {
    console.error('Error:', e)
}
