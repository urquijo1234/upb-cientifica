package co.edu.upb.cientifica.rmi.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import java.util.List;

/**
 * Validador de JWT RS256 emitidos por el SOAP Server.
 * Carga la clave pública desde un archivo PEM.
 */
public class JwtValidator {

    private final PublicKey publicKey;

    public JwtValidator(String publicKeyPath) throws Exception {
        this.publicKey = loadPublicKey(publicKeyPath);
    }

    private PublicKey loadPublicKey(String path) throws Exception {
        String keyContent = new String(Files.readAllBytes(Paths.get(path)));

        // Limpiar el PEM
        String publicKeyPEM = keyContent
                .replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s+", "");

        byte[] decoded = Base64.getDecoder().decode(publicKeyPEM);
        X509EncodedKeySpec keySpec = new X509EncodedKeySpec(decoded);
        KeyFactory keyFactory = KeyFactory.getInstance("RSA");
        return keyFactory.generatePublic(keySpec);
    }

    /**
     * Valida un JWT y retorna los claims si es válido.
     * Lanza JwtException si es inválido o expirado.
     */
    public ValidatedClaims validate(String token) throws JwtException {
        Claims claims = Jwts.parser()
                .verifyWith(publicKey)
                .requireIssuer("upb-cientifica-soap")
                .build()
                .parseSignedClaims(token)
                .getPayload();

        @SuppressWarnings("unchecked")
        List<String> roles = (List<String>) claims.get("roles");

        return new ValidatedClaims(
                claims.getSubject(),
                (String) claims.get("dn"),
                (String) claims.get("email"),
                roles
        );
    }

    public static class ValidatedClaims {
        public final String uid;
        public final String dn;
        public final String email;
        public final List<String> roles;

        public ValidatedClaims(String uid, String dn, String email, List<String> roles) {
            this.uid = uid;
            this.dn = dn;
            this.email = email;
            this.roles = roles;
        }
    }
}