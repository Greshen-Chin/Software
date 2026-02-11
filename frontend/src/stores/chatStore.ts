import { defineStore } from 'pinia';
import api from '../lib/api';
import { getSocket } from '../lib/socket';
import { useAuthStore } from './auth';

export const useChatStore = defineStore('chat', {
  state: () => ({
    activeGroupId: null as string | null,
    activeDMUserId: null as string | null,
    groupMessages: [] as any[],
    dmMessages: [] as any[],
    connected: false,
    listenersReady: false,
  }),
  actions: {
    connect() {
      const socket = getSocket();
      const anySocket = socket as any;
      if (!anySocket.__listenersAttached) {
        socket.on('connect', () => {
          this.connected = true;
        });
        socket.on('disconnect', () => {
          this.connected = false;
        });
        socket.on('receive_message', (msg) => {
          if (msg.groupId && msg.groupId === this.activeGroupId) {
            this.groupMessages.push(msg);
            return;
          }
          if (msg.recipientId && msg.senderId && this.activeDMUserId) {
            const authStore = useAuthStore();
            const currentUserId = authStore.user?.id;
            if (!currentUserId) return;
            const isForThisDm =
              (msg.senderId === this.activeDMUserId && msg.recipientId === currentUserId) ||
              (msg.senderId === currentUserId && msg.recipientId === this.activeDMUserId);
            if (isForThisDm) {
              this.dmMessages.push(msg);
            }
          }
        });
        anySocket.__listenersAttached = true;
        this.listenersReady = true;
      }
      if (!this.connected) {
        socket.connect();
      }
    },
    async openGroup(groupId: string) {
      this.activeGroupId = groupId;
      this.activeDMUserId = null;
      this.groupMessages = [];
      const res = await api.get(`/chat/group/${groupId}`);
      this.groupMessages = res.data || [];
      const socket = getSocket();
      this.connect();
      socket.emit('joinGroup', { groupId });
    },
    async openDM(userId: string) {
      this.activeDMUserId = userId;
      this.activeGroupId = null;
      this.dmMessages = [];
      const res = await api.get(`/chat/dm/${userId}`);
      this.dmMessages = res.data || [];
      const socket = getSocket();
      this.connect();
      socket.emit('joinDM', { userId });
    },
    sendGroupMessage(content: string) {
      if (!this.activeGroupId) return;
      const socket = getSocket();
      socket.emit('send_message', { type: 'group', groupId: this.activeGroupId, content });
    },
    sendDMMessage(content: string) {
      if (!this.activeDMUserId) return;
      const socket = getSocket();
      socket.emit('send_message', { type: 'dm', recipientId: this.activeDMUserId, content });
    },
  },
});
