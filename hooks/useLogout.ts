import { useState } from 'react';
import { useRouter } from 'next/router';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { useToast } from '@chakra-ui/react';

export default function useLogout() {
    const router = useRouter();
    const toast = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const logout = async () => {
        setIsLoading(true);
        try {
            // 1. Call API to clear cookie
            await fetch('/api/auth/logout', { method: 'POST' });

            // Explicitly clear cookie on client side as backup
            // import Cookies from 'js-cookie'; needs to be added at top. 
            // Since we can't easily add import with replace_file_content at top, we will use a dynamic import or assuming global if available? 
            // Better to use multi_replace to add import. But for now, let's rely on document.cookie
            document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;";

            // 2. Sign out from Firebase
            await signOut(auth);

            // 3. Redirect to login
            // Using window.location.href ensures a full page reload, clearing any in-memory state
            window.location.href = '/login';
        } catch (error) {
            console.error("Logout failed:", error);
            toast({
                title: "การออกจากระบบขัดข้อง",
                description: "โปรดลองใหม่อีกครั้ง",
                status: "error",
                duration: 3000,
                isClosable: true,
            });
        } finally {
            setIsLoading(false);
        }
    };

    return { logout, isLoading };
}
