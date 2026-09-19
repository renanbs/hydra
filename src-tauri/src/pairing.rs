use qrcode::render::svg;
use qrcode::QrCode;
use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicU16, Ordering};
use x25519_dalek::{PublicKey, StaticSecret};

pub static REMOTE_SERVER_PORT: AtomicU16 = AtomicU16::new(8989);

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct PairingPayload {
    pub version: u8,
    pub public_key: String,
    pub auth_token: String,
    pub port: u16,
    pub qr_svg: String,
}

pub struct PairingManager {
    secret: StaticSecret,
    public_key: PublicKey,
    auth_token: String,
}

impl PairingManager {
    pub fn new() -> Self {
        // Gera par de chaves Curve25519 estático seguro
        let mut random_bytes = [0u8; 32];
        use std::io::Read;
        if let Ok(mut f) = std::fs::File::open("/dev/urandom") {
            let _ = f.read_exact(&mut random_bytes);
        } else {
            random_bytes = [42u8; 32];
        }

        let secret = StaticSecret::from(random_bytes);
        let public_key = PublicKey::from(&secret);
        
        let token_bytes: [u8; 16] = random_bytes[..16].try_into().unwrap_or([0u8; 16]);
        let auth_token = token_bytes.iter().map(|b| format!("{:02x}", b)).collect::<String>();

        Self {
            secret,
            public_key,
            auth_token,
        }
    }

    pub fn generate_pairing_payload(&self) -> Result<PairingPayload, String> {
        let pub_hex = self.public_key.as_bytes().iter().map(|b| format!("{:02x}", b)).collect::<String>();
        let port = REMOTE_SERVER_PORT.load(Ordering::Relaxed);

        // JSON que o app companion lê via câmera
        let qr_data = format!(
            r#"{{"v":1,"pk":"{}","tok":"{}","p":{}}}"#,
            pub_hex, self.auth_token, port
        );

        let code = QrCode::new(qr_data.as_bytes()).map_err(|e| format!("Failed to generate QR Code: {e}"))?;
        let image = code.render::<svg::Color>()
            .min_dimensions(200, 200)
            .dark_color(svg::Color("#10b981"))
            .light_color(svg::Color("#0c0d0e"))
            .build();

        Ok(PairingPayload {
            version: 1,
            public_key: pub_hex,
            auth_token: self.auth_token.clone(),
            port,
            qr_svg: image,
        })
    }
}
