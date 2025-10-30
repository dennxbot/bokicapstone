import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';

interface BanInfo {
  isBanned: boolean;
  banReason?: string;
  customReason?: string;
  bannedUntil?: string;
  banMessage?: string;
  isLoading: boolean;
}

export const useBanStatus = () => {
  const { user } = useAuth();
  const [banInfo, setBanInfo] = useState<BanInfo>({
    isBanned: false,
    isLoading: true
  });

  useEffect(() => {
    const checkBanStatus = async () => {
      if (!user?.id) {
        setBanInfo({ isLoading: false, isBanned: false });
        return;
      }

      try {
        // Use server-side ban validation to prevent client-side time manipulation
        const { data: banData, error } = await supabase
          .rpc('is_user_banned', { p_user_id: user.id });

        if (error) {
          console.error('Error checking ban status:', error);
          setBanInfo({ isBanned: false, isLoading: false });
          return;
        }

        if (banData && banData.length > 0 && banData[0].is_banned) {
          setBanInfo({
            isLoading: false,
            isBanned: true,
            banReason: banData[0].ban_reason,
            customReason: banData[0].custom_reason,
            bannedUntil: banData[0].banned_until,
            banMessage: banData[0].ban_message
          });
        } else {
          setBanInfo({ isLoading: false, isBanned: false });
        }
      } catch (error) {
        console.error('Error checking ban status:', error);
        setBanInfo({ isBanned: false, isLoading: false });
      }
    };

    checkBanStatus();
  }, [user?.id]);

  return banInfo;
};