use std::path::PathBuf;

use tokio::{
    fs::{create_dir_all, File},
    io::{self, AsyncWriteExt},
};

pub async fn download_image_file(url: String) -> Result<Vec<u8>, reqwest::Error> {
    let file_response = reqwest::get(url).await?;

    let image_data = file_response.bytes().await?.to_vec();

    Ok(image_data)
}

pub async fn save_image_file(file_data: &Vec<u8>, filepath: PathBuf) -> Result<(), io::Error> {
    let parent = filepath.parent().unwrap();

    if !parent.exists() {
        create_dir_all(parent).await?;
    }

    let mut file = File::create(filepath).await?;

    file.write_all(&file_data).await?;

    Ok(())
}
