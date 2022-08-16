// Create a forEach Loop with async result
export async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        const element = array[index];
        await callback(element, index, array);
    }
}
