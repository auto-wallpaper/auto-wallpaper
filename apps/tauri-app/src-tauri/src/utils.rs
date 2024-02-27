use std::path::PathBuf;
use rand::Rng;

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
