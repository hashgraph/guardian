export async function safetyRunning(callback: () => void) {
    try {
        await callback();
        // tslint:disable-next-line:no-empty
    } catch (error) {
        //console.log(error);
    }
}
