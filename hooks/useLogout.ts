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
