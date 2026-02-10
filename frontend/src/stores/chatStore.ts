import { defineStore } from 'pinia';
import api from '../lib/api';
import { getSocket } from '../lib/socket';

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
      if (!this.listenersReady) {
        socket.on('connect', () => {
          this.connected = true;
        });
        socket.on('disconnect', () => {
          this.connected = false;
        });
        socket.on('groupMessage', (msg) => {
          if (msg.groupId === this.activeGroupId) {
            this.groupMessages.push(msg);
          }
        });
        socket.on('dmMessage', (msg) => {
          const otherId = msg.senderId === this.activeDMUserId ? msg.senderId : msg.recipientId;
          if (otherId === this.activeDMUserId) {
            this.dmMessages.push(msg);
          }
        });
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
      socket.emit('sendGroupMessage', { groupId: this.activeGroupId, content });
    },
    sendDMMessage(content: string) {
      if (!this.activeDMUserId) return;
      const socket = getSocket();
      socket.emit('sendDM', { recipientId: this.activeDMUserId, content });
    },
  },
});
