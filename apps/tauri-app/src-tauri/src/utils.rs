use rand::Rng;
use rimage::{image::ImageError, Decoder};
use std::fs::create_dir_all;
use std::path::PathBuf;

pub fn append_to_path(p: &PathBuf, s: &str) -> PathBuf {
    let mut p = p.clone().into_os_string();
    p.push(s);
    p.into()
}

pub fn generate_string(length: usize) -> String {
    let mut rng = rand::thread_rng();
    let chars = "abcdefghijklmnopqrstuvwxyz0123456789";
    let string: String = (0..length)
        .map(|_| {
            let index = rng.gen_range(0..chars.len());
            chars.chars().nth(index).unwrap()
        })
        .collect();
    string
}

pub fn optimize_image(
    image_path: &PathBuf,
    output_path: &PathBuf,
    nwidth: u32,
    nheight: u32,
) -> Result<(), ImageError> {
    let decoder = Decoder::from_path(&image_path)?;

    let image = decoder.decode()?;

    let new_image = image.resize(
        nwidth,
        nheight,
        rimage::image::imageops::FilterType::Nearest,
    );

    create_dir_all(output_path.parent().unwrap())?;

    new_image.save(output_path)?;

    Ok(())
}
