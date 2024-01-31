export const toBase64 = async (buffer: BlobPart) => {
    const base64url = await new Promise<string>((r) => {
        const reader = new FileReader();
        reader.onload = () => r(reader.result as string);
        reader.readAsDataURL(new Blob([buffer]));
    });
    return base64url;
}
