package com.hzer.inventario_system.util;

import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    @Autowired
    private UsuarioRepository usuarioRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        if (usuarioRepository.findByEmail("admin@tienda.com").isEmpty()) {

            Usuario admin = new Usuario();
            admin.setEmail("admin@tienda.com");

            String passwordEncriptada = passwordEncoder.encode("123456");
            admin.setPassword(passwordEncriptada);

            usuarioRepository.save(admin);

            System.out.println("-----------------------------------------");
            System.out.println("USUARIO DE PRUEBA CREADO EXITOSAMENTE");
            System.out.println("Email: admin@tienda.com");
            System.out.println("Password: 123456 (Guardada como Hash)");
            System.out.println("-----------------------------------------");
        }
    }
}