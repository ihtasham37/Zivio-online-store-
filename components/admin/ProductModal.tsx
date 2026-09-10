import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../hooks/useStore';
import { Product, SizeCategory, Category } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Spinner } from '../ui/Spinner';
import { Icons } from '../icons/Icons';
import { MediaPreview } from '../ui/MediaPreview';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categoryLock?: string;
}

// Helper to build a flat list of categories with indentation for the dropdown
const getCategoryOptions = (categories: Category[]): { id: string, name: string }[] => {
    type CategoryNode = Category & { children: CategoryNode[] };
    const categoryMap = new Map<string, CategoryNode>();
    const roots: CategoryNode[] = [];
    const options: { id: string, name: string }[] = [];

    categories.forEach(c => categoryMap.set(c.id, { ...c, children: [] }));
    categories.forEach(c => {
        if (c.parentId && categoryMap.has(c.parentId)) categoryMap.get(c.parentId)?.children.push(categoryMap.get(c.id)!);
        else roots.push(categoryMap.get(c.id)!);
    });

    const traverse = (node: CategoryNode, depth: number) => {
        options.push({ id: node.name, name: `${'— '.repeat(depth)}${node.name}` });
        node.children.forEach(child => traverse(child, depth + 1));
    };
    roots.forEach(root => traverse(root, 0));
    return options;
};

export const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, product, categoryLock }) => {
  const { addProduct, updateProduct, uploadFile, settings } = useStore();
  const [formData, setFormData] = useState<Omit<Product, 'id' | 'createdAt'>>({ name: '', customId: '', description: '', price: 0, oldPrice: 0, category: '', images: [], isVisible: true, sizeCategories: [], deliveryTime: 'Delivery in 3 Days', easyReturn: false, returnPolicy: '', shippingFee: 0, freeDelivery: false });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [newSizeInputs, setNewSizeInputs] = useState<Record<number, string>>({});
  const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const categoryOptions = useMemo(() => {
    const allCats = settings?.categories || [];
    // Only allow selecting child categories (categories that have a parent)
    const childCategoryNames = new Set(allCats.filter(c => c.parentId).map(c => c.name));
    return getCategoryOptions(allCats).filter(opt => childCategoryNames.has(opt.id));
  }, [settings?.categories]);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name, customId: product.customId || '', description: product.description, price: product.price, oldPrice: product.oldPrice || 0,
        category: product.category, images: product.images, isVisible: product.isVisible, sizeCategories: product.sizeCategories || [],
        deliveryTime: product.deliveryTime || 'Delivery in 3 Days', easyReturn: product.easyReturn || false,
        returnPolicy: product.returnPolicy || '', shippingFee: product.shippingFee || 0, freeDelivery: product.freeDelivery || false
      });
    } else {
      setFormData({ 
          name: '', customId: '', description: '', price: 0, oldPrice: 0, 
          category: categoryLock || categoryOptions[0]?.id || '', 
          images: [], isVisible: true, sizeCategories: [], deliveryTime: 'Delivery in 3 Days', 
          easyReturn: false, returnPolicy: '', shippingFee: 0, freeDelivery: false 
      });
    }
    setUploadError(''); setIsUploading(false); setNewCategoryName(''); setNewSizeInputs({});
  }, [product, isOpen, settings, categoryLock, categoryOptions]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') setFormData({ ...formData, [name]: (e.target as HTMLInputElement).checked });
    else setFormData({ ...formData, [name]: type === 'number' ? parseFloat(value) : value });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      setIsUploading(true); setUploadError('');
      try {
        const uploadedUrls: string[] = [];
        for (let i = 0; i < e.target.files.length; i++) {
          const file = e.target.files[i];
          const url = await uploadFile(file);
          uploadedUrls.push(url);
        }
        setFormData(prev => ({ ...prev, images: [...prev.images, ...uploadedUrls]}));
      } catch (err: any) { setUploadError(err.message || 'Upload error.'); } 
      finally { setIsUploading(false); }
  };

  const handleAddImageUrl = () => {
    if (imageUrl.trim()) {
        try { new URL(imageUrl.trim()); setFormData(prev => ({ ...prev, images: [...prev.images, imageUrl.trim()] })); setImageUrl(''); } 
        catch (_) { alert('Invalid URL.'); }
    }
  };

  const handleCreateAndAddCategory = () => {
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || formData.sizeCategories?.some(c => c.categoryName.toLowerCase() === trimmedName.toLowerCase())) {
        alert("Category name is empty or already exists."); return;
    }
    setFormData(prev => ({ ...prev, sizeCategories: [...(prev.sizeCategories || []), { categoryName: trimmedName, sizes: [] }] }));
    setNewCategoryName('');
  };

  const removeCategory = (i: number) => setFormData(prev => ({ ...prev, sizeCategories: (prev.sizeCategories || []).filter((_, idx) => idx !== i) }));
  const addSize = (i: number) => {
      const size = newSizeInputs[i]?.trim();
      if (size && formData.sizeCategories) {
          const newCats = formData.sizeCategories.map(c => ({...c, sizes: [...c.sizes]}));
          if (!newCats[i].sizes.includes(size)) {
              newCats[i].sizes.push(size);
              setFormData(prev => ({ ...prev, sizeCategories: newCats }));
              setNewSizeInputs(prev => ({ ...prev, [i]: '' }));
          }
      }
  };
  const removeSize = (catIdx: number, sizeIdx: number) => {
    if (!formData.sizeCategories) return;
    const newCats = formData.sizeCategories.map(c => ({...c, sizes: [...c.sizes]}));
    newCats[catIdx].sizes.splice(sizeIdx, 1);
    setFormData(prev => ({ ...prev, sizeCategories: newCats }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.category) { alert('Please select a category.'); return; }
    setIsSubmitting(true);
    try {
      if (product) await updateProduct({ ...formData, id: product.id, createdAt: product.createdAt });
      else await addProduct(formData);
      onClose();
    } catch (error) { console.error("Failed to save product", error); } 
    finally { setIsSubmitting(false); }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">{product ? 'Edit Product' : 'Add Product'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Name" name="name" value={formData.name} onChange={handleChange} required />
          <Input label="Custom Product ID (for Admin)" name="customId" value={formData.customId || ''} onChange={handleChange} placeholder="e.g., SKU-12345" />
          <Textarea label="Description" name="description" value={formData.description} onChange={handleChange} rows={3} required />
          <div className="grid grid-cols-2 gap-4"><Input label="Price" name="price" type="number" step="0.01" value={formData.price} onChange={handleChange} required /><Input label="Old Price (Optional)" name="oldPrice" type="number" step="0.01" value={formData.oldPrice} onChange={handleChange} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700">Category</label>
                <select id="category" name="category" value={formData.category} onChange={handleChange} required disabled={!!categoryLock} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-gray-900 focus:outline-none focus:ring-teal-500 focus:border-teal-600 sm:text-sm disabled:bg-gray-100">
                    <option value="">Select a Category</option>
                    {categoryOptions.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                </select>
                {categoryOptions.length === 0 && <p className="mt-1 text-xs text-red-500">No child categories found. Products can only be added to child categories.</p>}
            </div>
            <Input label="Shipping Fee" name="shippingFee" type="number" step="1" value={formData.shippingFee || 0} onChange={handleChange} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Size Categories</label>
            <div className="p-3 border rounded-md space-y-3">
              {(formData.sizeCategories || []).map((cat, i) => (
                  <fieldset key={i} className="bg-gray-50 p-3 rounded-lg border">
                      <legend className="font-semibold px-2 flex justify-between items-center w-full"><span>{cat.categoryName}</span><Button type="button" variant="danger" size="xs" onClick={() => removeCategory(i)}><Icons.trash className="w-3 h-3"/></Button></legend>
                      <div className="flex flex-wrap gap-2 pt-2">{cat.sizes.map((s, si) => (<span key={si} className="flex items-center bg-white border border-gray-300 px-2 py-1 rounded text-sm">{s}<button type="button" onClick={() => removeSize(i, si)} className="ml-2 text-red-500"><Icons.x className="w-3 h-3" /></button></span>))}</div>
                      <div className="flex gap-2 mt-2"><Input placeholder="Add size" value={newSizeInputs[i] || ''} onChange={(e) => setNewSizeInputs(p => ({...p, [i]: e.target.value}))} className="h-8 text-sm"/><Button type="button" size="sm" onClick={() => addSize(i)}>Add</Button></div>
                  </fieldset>
              ))}
            </div>
            <div className="mt-4 bg-gray-50 p-3 rounded-md border">
                <h4 className="text-sm font-bold mb-2">Add New Size Category</h4>
                <div className="flex gap-2 items-center"><Input placeholder="e.g., Shirt Size" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} /><Button type="button" onClick={handleCreateAndAddCategory}>Create</Button></div>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Images</label>
            <div className="flex gap-2 my-2 border-b pb-3"><Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>Upload</Button><Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>URL</Button></div>
            {imageInputMode === 'upload' ? <Input type="file" multiple onChange={handleFileUpload} accept="image/*,video/*" disabled={isUploading} /> : <div className="flex gap-2"><Input placeholder="https://example.com/image.jpg" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); handleAddImageUrl(); }}}/><Button type="button" onClick={handleAddImageUrl} className="self-end">Add</Button></div>}
            {isUploading && <div className="mt-2"><Spinner size="sm" /></div>}
            {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
            <div className="grid grid-cols-4 gap-2 mt-2">{formData.images.map((img, i) => (<div key={i} className="relative group"><MediaPreview src={img} className="w-full h-20" /><button type="button" onClick={() => setFormData({ ...formData, images: formData.images.filter((_, idx) => idx !== i) })} className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100"><Icons.x className="w-3 h-3" /></button></div>))}</div>
          </div>
          <div className="space-y-2 border p-3 rounded-md bg-gray-50">
              <h4 className="font-semibold text-sm">Delivery & Returns</h4>
              <Input label="Delivery Time" name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} />
              <div className="flex items-center gap-4">
                  <div className="flex items-center"><input type="checkbox" id="freeDelivery" name="freeDelivery" checked={formData.freeDelivery} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="freeDelivery" className="ml-2 block text-sm">Free Delivery</label></div>
                  <div className="flex items-center"><input type="checkbox" id="easyReturn" name="easyReturn" checked={formData.easyReturn} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="easyReturn" className="ml-2 block text-sm">Easy Return</label></div>
              </div>
              {formData.easyReturn && (<Input label="Return Policy" name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} />)}
          </div>
          <div className="flex items-center"><input type="checkbox" id="isVisible" name="isVisible" checked={formData.isVisible} onChange={handleChange} className="h-4 w-4 text-teal-600" /><label htmlFor="isVisible" className="ml-2 block text-sm">Visible in store</label></div>
          <div className="flex justify-end gap-4 pt-4 border-t"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" disabled={isSubmitting || isUploading}>{isSubmitting ? <Spinner size="sm" /> : (product ? 'Save Changes' : 'Add Product')}</Button></div>
        </form>
      </div>
    </div>
  );
};