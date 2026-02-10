import { defineStore } from 'pinia';
import api from '../lib/api';

export const useSocialStore = defineStore('social', {
  state: () => ({
    friends: [] as any[],
    groups: [] as any[],
  }),
  actions: {
    async fetchFriends() {
      const res = await api.get('/social/friends');
      this.friends = res.data || [];
    },
    async fetchGroups() {
      const res = await api.get('/social/groups');
      this.groups = res.data || [];
    },
    async searchUsersByEmail(email: string) {
      const res = await api.post('/social/friends/search', { email });
      return res.data || [];
    },
    async searchUsersByName(name: string) {
      const res = await api.post('/social/friends/search-name', { name });
      return res.data || [];
    },
    async searchUsersById(id: string) {
      const res = await api.post('/social/friends/search-id', { id });
      return res.data || [];
    },
    async addFriend(friendId: string) {
      const res = await api.post('/social/friends/add', { friendId });
      return res.data;
    },
    async addGroupMember(groupId: string, userId: string, canCreateSchedule: boolean) {
      const res = await api.post(`/social/groups/${groupId}/members`, {
        userId,
        canCreateSchedule,
      });
      return res.data;
    },
  },
});
