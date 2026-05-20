package com.hzer.inventario_system.service;

import com.hzer.inventario_system.dto.LoginRequest;
import com.hzer.inventario_system.entities.Usuario;
import com.hzer.inventario_system.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import java.util.Optional;

@Service
public class AuthService {

    @Autowired
    private UsuarioRepository usuarioRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    public boolean autenticar(LoginRequest loginRequest){

        Optional<Usuario> usuarioOpt = usuarioRepository.findByEmail(loginRequest.getEmail());

        if (usuarioOpt.isPresent()){
                Usuario usuario = usuarioOpt.get();
                return  passwordEncoder.matches(loginRequest.getPassword(),usuario.getPassword());
        }

        return false;
    }




}
