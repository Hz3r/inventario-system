// src/pages/Inventory.tsx
import { useCallback, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ProductTable } from '../components/inventory/ProductTable';
import { ProductModal } from '../components/inventory/ProductModal';
import { inventarioService } from '../services/inventarioService';
import { ApiError } from '../services/api';
import { ESTADO_LABEL, type Categoria, type EstadoStock, type Producto } from '../types/inventario';

export function Inventory() {
    const location = useLocation();

    // Datos que vienen del backend
    const [products, setProducts] = useState<Producto[]>([]);
    const [categorias, setCategorias] = useState<Categoria[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Producto | null>(null);

    // Filtros
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<number | 'Todas'>('Todas');
    const [selectedStatus, setSelectedStatus] = useState<EstadoStock | 'Todos'>('Todos');

    // Carga productos y categorías a la vez
    const cargar = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [prods, cats] = await Promise.all([
                inventarioService.listarProductos(),
                inventarioService.listarCategorias(),
            ]);
            setProducts(prods);
            setCategorias(cats);
        } catch (e) {
            setError(e instanceof ApiError ? e.message : 'Error al cargar el inventario');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        cargar();
    }, [cargar]);

    // El Dashboard puede mandarnos aquí pidiendo abrir el modal o filtrar por estado
    useEffect(() => {
        const state = location.state as { openModal?: boolean; filterStatus?: string } | null;
        if (!state) return;
        if (state.openModal) setIsModalOpen(true);
        if (state.filterStatus) {
            const estado = (Object.keys(ESTADO_LABEL) as EstadoStock[]).find(
                (k) => k === state.filterStatus || ESTADO_LABEL[k] === state.filterStatus,
            );
            if (estado) setSelectedStatus(estado);
        }
        window.history.replaceState({}, document.title);
    }, [location]);

    // Al guardar en el modal: reemplaza o agrega sin volver a pedir toda la lista
    const handleSaved = (saved: Producto) => {
        setProducts((prev) => {
            const existe = prev.some((p) => p.id === saved.id);
            const lista = existe ? prev.map((p) => (p.id === saved.id ? saved : p)) : [...prev, saved];
            return lista.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
        });
    };

    const handleDelete = async (producto: Producto) => {
        if (!confirm(`¿Eliminar "${producto.nombre}"? Su historial de ventas y kardex se conserva.`)) return;
        try {
            await inventarioService.desactivarProducto(producto.id);
            setProducts((prev) => prev.filter((p) => p.id !== producto.id));
        } catch (e) {
            alert(e instanceof ApiError ? e.message : 'No se pudo eliminar el producto');
        }
    };

    const handleEdit = (producto: Producto) => {
        setEditingProduct(producto);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingProduct(null);
    };

    // Filtrado en pantalla (instantáneo, sin ir al servidor)
    const texto = searchTerm.trim().toLowerCase();
    const filteredProducts = products.filter((p) => {
        const matchesSearch =
            texto === '' ||
            p.nombre.toLowerCase().includes(texto) ||
            (p.codigoBarras ?? '').includes(texto) ||
            p.presentaciones.some((pr) => (pr.codigoBarras ?? '').includes(texto));
        const matchesCategory = selectedCategory === 'Todas' || p.categoriaId === selectedCategory;
        const matchesStatus = selectedStatus === 'Todos' || p.estadoStock === selectedStatus;
        return matchesSearch && matchesCategory && matchesStatus;
    });

    return (
        <div className="space-y-6 animate-fade-in">
            <ProductModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSaved={handleSaved}
                productToEdit={editingProduct}
                categorias={categorias}
            />

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
                    <p className="text-sm text-gray-500">
                        Gestiona tus productos y existencias
                        {!loading && !error && ` · ${products.length} productos`}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-black text-white px-6 py-2.5 rounded-xl font-bold shadow-lg hover:bg-gray-800 transition flex items-center gap-2"
                >
                    <span>+</span> Nuevo Producto
                </button>
            </div>

            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium flex items-center justify-between gap-4">
                    <span>{error}</span>
                    <button onClick={cargar} className="font-bold underline">Reintentar</button>
                </div>
            )}

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-4">
                {/* Buscador: también funciona con la pistola */}
                <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre o escanear código..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm"
                    />
                </div>

                {/* Categorías: ahora vienen de la base de datos */}
                <div className="w-full md:w-48">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value === 'Todas' ? 'Todas' : Number(e.target.value))}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm bg-white cursor-pointer"
                    >
                        <option value="Todas">Todas las categorías</option>
                        {categorias.map((c) => (
                            <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                    </select>
                </div>

                <div className="w-full md:w-48">
                    <select
                        value={selectedStatus}
                        onChange={(e) => setSelectedStatus(e.target.value as EstadoStock | 'Todos')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-black outline-none transition text-sm bg-white cursor-pointer"
                    >
                        <option value="Todos">Todos los estados</option>
                        {(Object.keys(ESTADO_LABEL) as EstadoStock[]).map((k) => (
                            <option key={k} value={k}>{ESTADO_LABEL[k]}</option>
                        ))}
                    </select>
                </div>
            </div>

            <ProductTable
                products={filteredProducts}
                loading={loading}
                onDelete={handleDelete}
                onEdit={handleEdit}
            />
        </div>
    );
}