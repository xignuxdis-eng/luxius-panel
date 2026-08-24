import React from 'react';
import Modal from '@components/ui/Modal';
import { XpressViewer } from '../../pages/XpressViewer/XpressViewer';

interface XpressViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFileUrl?: string;
    initialFileName?: string;
}

export const XpressViewerModal: React.FC<XpressViewerModalProps> = ({ isOpen, onClose, initialFileUrl, initialFile, initialFileName }) => {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Xpress Viewer - ${initialFileName || 'Archivo'}`} size="full">
            <div style={{ height: 'calc(100vh - 120px)', width: '100%', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#0f172a' }}>
                    <XpressViewer 
                        initialFileUrl={initialFileUrl}
                        initialFile={initialFile} 
                        initialFileName={initialFileName} 
                        onClose={onClose} 
                    />
                </div>
            </div>
        </Modal>
    );
};

export default XpressViewerModal;

