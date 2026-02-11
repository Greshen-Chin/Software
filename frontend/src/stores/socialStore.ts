import { defineStore } from 'pinia';
import api from '../lib/api';

export const useSocialStore = defineStore('social', {
  state: () => ({
    friends: [] as any[],
    groups: [] as any[],
    groupInvites: [] as any[],
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
    async fetchGroupInvites() {
      const res = await api.get('/social/groups/invites');
      this.groupInvites = res.data || [];
      return this.groupInvites;
    },
    async sendGroupInvite(groupId: string, userId: string) {
      const res = await api.post(`/social/groups/${groupId}/invites`, { userId });
      return res.data;
    },
    async acceptGroupInvite(inviteId: string) {
      const res = await api.post(`/social/groups/invites/${inviteId}/accept`);
      return res.data;
    },
    async rejectGroupInvite(inviteId: string) {
      const res = await api.post(`/social/groups/invites/${inviteId}/reject`);
      return res.data;
    },
    async getUserProfile(userId: string, groupId?: string) {
      const query = groupId ? `?groupId=${groupId}` : '';
      const res = await api.get(`/social/users/${userId}/profile${query}`);
      return res.data;
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
    async requestFriendByCode(userCode: string) {
      const res = await api.post('/social/friends/request', { userCode });
      return res.data;
    },
    async requestFriendById(friendId: string) {
      const res = await api.post('/social/friends/request', { friendId });
      return res.data;
    },
    async getFriendRequests() {
      const res = await api.get('/social/friends/requests');
      return res.data || [];
    },
    async getSentFriendRequests() {
      const res = await api.get('/social/friends/requests/sent');
      return res.data || [];
    },
    async acceptFriendRequest(requestId: string) {
      const res = await api.post(`/social/friends/requests/${requestId}/accept`);
      return res.data;
    },
    async rejectFriendRequest(requestId: string) {
      const res = await api.post(`/social/friends/requests/${requestId}/reject`);
      return res.data;
    },
    async createGroup(name: string) {
      const res = await api.post('/social/groups', { name });
      return res.data;
    },
    async addGroupMember(groupId: string, userId: string, canCreateSchedule: boolean) {
      const res = await api.post(`/social/groups/${groupId}/members`, {
        userId,
        canCreateSchedule,
      });
      return res.data;
    },
    async updateGroupName(groupId: string, name: string) {
      const res = await api.patch(`/social/groups/${groupId}`, { name });
      return res.data;
    },
    async removeGroupMember(groupId: string, memberId: string) {
      const res = await api.post(`/social/groups/${groupId}/members/${memberId}/remove`);
      return res.data;
    },
    async promoteToModerator(groupId: string, memberId: string) {
      const res = await api.post(`/social/groups/${groupId}/members/${memberId}/promote`);
      return res.data;
    },
    async demoteToMember(groupId: string, memberId: string) {
      const res = await api.post(`/social/groups/${groupId}/members/${memberId}/demote`);
      return res.data;
    },
    async transferAdmin(groupId: string, targetUserId: string) {
      const res = await api.post(`/social/groups/${groupId}/transfer-admin`, { targetUserId });
      return res.data;
    },
  },
});
