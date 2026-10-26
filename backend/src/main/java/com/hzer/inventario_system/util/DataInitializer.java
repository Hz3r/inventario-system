package com.hzer.inventario_system.util;

import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    /** Contraseña del primer usuario. En Railway se pone ADMIN_CLAVE (¡nunca dejar 123456 en internet!) */
    @Value("${app.admin.clave-inicial:123456}")
    private String claveInicial;

    @Override
    public void run(String... args) throws Exception {
        if (usuarioRepository.findByEmail("admin@tienda.com").isEmpty()) {

            Usuario admin = new Usuario();
            admin.setEmail("admin@tienda.com");
            admin.setNombre("Administrador");

            String passwordEncriptada = passwordEncoder.encode(claveInicial);
            admin.setPassword(passwordEncriptada);

            usuarioRepository.save(admin);

            System.out.println("-----------------------------------------");
            System.out.println("USUARIO DE PRUEBA CREADO EXITOSAMENTE");
            System.out.println("Email: admin@tienda.com");
            System.out.println("Password: la de app.admin.clave-inicial (cambiala en Configuraciones)");
            System.out.println("-----------------------------------------");
        }
    }
}