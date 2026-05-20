// src/pages/Inventory.tsx
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { ProductTable } from '../components/inventory/ProductTable';
import { ProductModal } from '../components/inventory/ProductModal';
import { Product } from '../types/product';

export function Inventory() {
    const location = useLocation();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);

    // Estados para los filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Todas');
    const [selectedStatus, setSelectedStatus] = useState('Todos');

    // ==========================================
    // MAGIA DE LOCALSTORAGE (SIN HARDCODEAR)
    // ==========================================

    // 1. Cargamos los productos guardados al iniciar la página
    const [products, setProducts] = useState<Product[]>(() => {
        const savedProducts = localStorage.getItem('bodega_productos');
        if (savedProducts) {
            return JSON.parse(savedProducts);
        } else {
            return []; // Empezamos en blanco si no hay nada guardado
        }
    });

    // 2. Cada vez que la lista "products" cambie, la guardamos en el navegador
    useEffect(() => {
        localStorage.setItem('bodega_productos', JSON.stringify(products));
    }, [products]);

    // ==========================================

    useEffect(() => {
        if (location.state) {
            if (location.state.openModal) {
                setIsModalOpen(true);
            }
            if (location.state.filterStatus) {
                setSelectedStatus(location.state.filterStatus);
            }
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    // Función para Guardar (Nuevo o Editar)
    const handleSaveProduct = (savedProduct: Product) => {
        if (editingProduct) {
            setProducts(products.map(p => p.id === savedProduct.id ? savedProduct : p));
        } else {
            setProducts([savedProduct, ...products]);
        }
        setEditingProduct(null);
    };

    // Función para Eliminar
    const handleDeleteProduct = (id: number) => {
        if(confirm('¿Estás seguro de que deseas eliminar este producto?')) {
            setProducts(products.filter(product => product.id !== id));
        }
    };

    // Función para Editar
    const handleEditProduct = (product: Product) => {
        setEditingProduct(product);
        setIsModalOpen(true);
    };

    // Función para cerrar modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    // Lógica de Filtrado
    const filteredProducts = products.filter(product => {
        const matchesSearch = product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.codigo.includes(searchTerm);
        const matchesCategory = selectedCategory === 'Todas' || product.categoria === selectedCategory;
        const matchesStatus = selectedStatus === 'Todos' || product.status === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSave={handleSaveProduct}
                productToEdit={editingProduct}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                    <p className="text-sm text-gray-500">Gestiona tus productos y existencias</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition flex items-center gap-2"
                >
                    <span>+</span> Nuevo Producto
                </button>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                {/* Buscador */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input type="text" placeholder="Buscar por código o nombre..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm" />
                </div>

                {/* Categoría */}
                <div className="w-full md:w-48">
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm bg-white cursor-pointer">
                        <option value="Todas">Todas las categorías</option>
                        <option value="Bebidas">Bebidas</option>
                        <option value="Snacks">Snacks</option>
                        <option value="Abarrotes">Abarrotes</option>
                        <option value="Limpieza">Limpieza</option>
                        <option value="Lácteos">Lácteos</option>
                    </select>
                </div>

                {/* Filtro de Estado */}
                <div className="w-full md:w-48">
                    <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)} className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm bg-white cursor-pointer">
                        <option value="Todos">Todos los estados</option>
                        <option value="En Stock">En Stock</option>
                        <option value="Bajo Stock">Bajo Stock</option>
                        <option value="Sin Stock">Sin Stock</option>
                    </select>
                </div>
            </div>

            <ProductTable
                products={filteredProducts}
                onDelete={handleDeleteProduct}
                onEdit={handleEditProduct}
            />
        </div>
    );
}