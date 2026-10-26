package com.hzer.inventario_system.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.resource.PathResourceResolver;

import java.io.IOException;

/**
 * El backend también entrega la página web (la carpeta Frontend/dist va dentro del jar, en /static).
 * Así todo el sistema es UN solo programa en UN solo puerto (8080).
 *
 * React maneja sus propias rutas (/pos, /inventario...). Si alguien recarga en /pos,
 * aquí no existe ese archivo, así que devolvemos index.html y React muestra la pantalla correcta.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/")
                .resourceChain(true)
                .addResolver(new PathResourceResolver() {
                    @Override
                    protected Resource getResource(String ruta, Resource carpeta) throws IOException {
                        Resource archivo = carpeta.createRelative(ruta);
                        if (archivo.exists() && archivo.isReadable()) {
                            return archivo;                                  // JS, CSS, íconos...
                        }
                        if (ruta.startsWith("api/") || ruta.startsWith("actuator")) {
                            return null;                                     // una API que no existe → 404 normal
                        }
                        Resource index = carpeta.createRelative("index.html");
                        return index.exists() ? index : null;                // rutas de React
                    }
                });
    }
}
