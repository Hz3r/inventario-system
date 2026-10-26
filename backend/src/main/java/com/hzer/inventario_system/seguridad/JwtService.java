package com.hzer.inventario_system.seguridad;

import com.hzer.inventario_system.entities.Usuario;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

/**
 * Crea el token de sesión. Es un texto firmado con una clave que solo conoce el servidor:
 * si alguien lo modifica (ej. cambia el correo), la firma deja de coincidir y se rechaza.
 */
@Service
public class JwtService {

    private final JwtEncoder encoder;
    private final long dias;

    public JwtService(JwtEncoder encoder, @Value("${app.jwt.dias}") long dias) {
        this.encoder = encoder;
        this.dias = dias;
    }

    public record TokenGenerado(String token, Instant expiraEn) {
    }

    public TokenGenerado generar(Usuario u) {
        Instant ahora = Instant.now();
        Instant expira = ahora.plus(dias, ChronoUnit.DAYS);
        JwtClaimsSet claims = JwtClaimsSet.builder()
                .issuer("inventario-system")
                .issuedAt(ahora)
                .expiresAt(expira)
                .subject(u.getEmail())                 // quién es
                .claim("nombre", u.getNombre() != null ? u.getNombre() : u.getEmail())
                .claim("rol", u.getRol().name())
                .build();
        JwsHeader header = JwsHeader.with(MacAlgorithm.HS256).build();
        String token = encoder.encode(JwtEncoderParameters.from(header, claims)).getTokenValue();
        return new TokenGenerado(token, expira);
    }
}
