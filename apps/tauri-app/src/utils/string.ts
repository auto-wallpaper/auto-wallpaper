export const createFilename = (text: string) => {
    const cleanText = text.replace(/[^a-zA-Z0-9-_\s]/g, "").slice(0, 40).replaceAll(" ", "_");

    const date = new Date();
    const year = date.getFullYear().toString().padStart(4, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const hour = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");

    const filename = `${cleanText}_${year}-${month}-${day}_${hour}-${minutes}-${seconds}`;

    return filename;
}