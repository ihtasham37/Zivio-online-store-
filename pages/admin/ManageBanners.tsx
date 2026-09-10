
import React, { useState, useEffect } from 'react';
import { useStore } from '../../hooks/useStore';
import { Banner } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Spinner } from '../../components/ui/Spinner';
import { Icons } from '../../components/icons/Icons';
import { MediaPreview } from '../../components/ui/MediaPreview';

const BannerModal = ({ isOpen, onClose, banner }: { isOpen: boolean; onClose: () => void; banner: Banner | null; }) => {
    const { addBanner, updateBanner, uploadFile } = useStore();
    const [formData, setFormData] = useState<Omit<Banner, 'id' | 'createdAt'>>({
        imageUrl: '',
        redirectUrl: '',
        isActive: true,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadError, setUploadError] = useState('');
    const [imageInputMode, setImageInputMode] = useState<'upload' | 'url'>('upload');

    useEffect(() => {
        if (banner) {
            setFormData({
                imageUrl: banner.imageUrl,
                redirectUrl: banner.redirectUrl || '',
                isActive: banner.isActive,
            });
        } else {
            setFormData({ imageUrl: '', redirectUrl: '', isActive: true });
        }
        setUploadError('');
        setIsUploading(false);
    }, [banner, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        setUploadError('');
        try {
            // FIX: Removed the extra 'banners' argument, as uploadFile only expects one argument.
            const url = await uploadFile(file);
            setFormData(prev => ({ ...prev, imageUrl: url }));
        } catch (err: any) {
            setUploadError(err.message || 'An error occurred during upload.');
        } finally {
            setIsUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.imageUrl) {
            alert('Please provide an image URL or upload an image.');
            return;
        }
        setIsSubmitting(true);
        try {
            if (banner) {
                await updateBanner({ ...formData, id: banner.id, createdAt: banner.createdAt });
            } else {
                await addBanner(formData);
            }
            onClose();
        } catch (error) {
            console.error("Failed to save banner:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                <h2 className="text-2xl font-bold mb-4">{banner ? 'Edit Banner' : 'Add New Banner'}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Banner Image</label>
                        <div className="flex gap-2 my-2 border-b pb-3">
                            <Button type="button" size="sm" variant={imageInputMode === 'upload' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('upload')}>Upload File</Button>
                            <Button type="button" size="sm" variant={imageInputMode === 'url' ? 'primary' : 'secondary'} onClick={() => setImageInputMode('url')}>Set URL</Button>
                        </div>
                        {imageInputMode === 'upload' ? (
                            <Input type="file" onChange={handleImageUpload} accept="image/*,video/*" disabled={isUploading} />
                        ) : (
                            <Input label="Image/Video URL" name="imageUrl" value={formData.imageUrl} onChange={handleChange} placeholder="https://example.com/banner.mp4" />
                        )}
                        {isUploading && <div className="mt-2"><Spinner size="sm" /></div>}
                        {uploadError && <p className="mt-2 text-sm text-red-500">{uploadError}</p>}
                        {formData.imageUrl && <MediaPreview src={formData.imageUrl} className="mt-2 w-full h-auto max-h-40" />}
                    </div>

                    <Input label="Redirect URL (Optional)" name="redirectUrl" value={formData.redirectUrl} onChange={handleChange} placeholder="https://yourstore.com/sale" />
                    
                    <div className="flex items-center">
                        <input type="checkbox" id="isActive" name="isActive" checked={formData.isActive} onChange={handleChange} className="h-4 w-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500" />
                        <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">Activate this banner</label>
                    </div>

                    <div className="flex justify-end gap-4 pt-4 border-t">
                        <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting || isUploading}>
                            {isSubmitting ? <Spinner size="sm" /> : 'Save Banner'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const ManageBanners = () => {
    const { banners, deleteBanner, updateBanner, isLoading } = useStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBanner, setSelectedBanner] = useState<Banner | null>(null);

    const openModal = (banner: Banner | null = null) => {
        setSelectedBanner(banner);
        setIsModalOpen(true);
    };

    const handleDelete = (banner: Banner) => {
        if (window.confirm(`Are you sure you want to delete this banner?`)) {
            deleteBanner(banner);
        }
    };
    
    const toggleActive = (banner: Banner) => {
        updateBanner({ ...banner, isActive: !banner.isActive });
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Manage Banners</h1>
                <Button onClick={() => openModal()} size="md">
                    <Icons.plus className="w-5 h-5 mr-2" /> Add Banner
                </Button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gray-50 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                        <tr>
                            <th className="p-3">Image</th>
                            <th className="p-3">Redirect URL</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                        {isLoading && banners.length === 0 ? (
                            <tr><td colSpan={4} className="text-center p-8"><Spinner/></td></tr>
                        ) : banners.map(banner => (
                            <tr key={banner.id} className="hover:bg-gray-50 text-sm">
                                <td className="p-3">
                                    <MediaPreview src={banner.imageUrl} className="w-24 h-auto" />
                                </td>
                                <td className="p-3 text-gray-600 max-w-xs truncate">
                                    <a href={banner.redirectUrl} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                        {banner.redirectUrl || 'Not set'}
                                    </a>
                                </td>
                                <td className="p-3">
                                    <button onClick={() => toggleActive(banner)} title={banner.isActive ? "Active (Click to deactivate)" : "Inactive (Click to activate)"}>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${banner.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {banner.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </button>
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                    <div className="flex gap-3">
                                        <button onClick={() => openModal(banner)} className="text-blue-500 hover:text-blue-700" title="Edit Banner"><Icons.edit className="w-5 h-5"/></button>
                                        <button onClick={() => handleDelete(banner)} className="text-red-500 hover:text-red-700" title="Delete Banner"><Icons.trash className="w-5 h-5"/></button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {banners.length === 0 && !isLoading && (
                    <p className="text-center p-8 text-gray-500">No banners found. Click 'Add Banner' to create one.</p>
                )}
            </div>
            <BannerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} banner={selectedBanner} />
        </div>
    );
};

export default ManageBanners;