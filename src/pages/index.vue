<template>
	<div class="bg-discord-blurple-500 py-20">
		<div class="max-w-3xl sm:mx-auto text-center px-8 sm:px-16 flex flex-col gap-10 md:px-12">
			<Logo class="filter drop-shadow-lg my-6" />
			<InstallButton />
		</div>
	</div>

	<div
		class="
			prose prose-discord
			dark:prose-light
			lg:prose-lg
			px-6
			mx-auto
			pb-8
			w-full
			xl:grid xl:grid-cols-2 xl:gap-x-12 xl:max-w-7xl
		"
	>
		<div class="col-span-full">
			<h2>About</h2>
			<p>
				discord.js-cluster is a powerful cluster manager for the
				<a href="https://discord.js.org" target="_blank" rel="noopener"
					>Discord.js <heroicons-outline-external-link class="h-5 w-5 inline-block mb-1" aria-hidden="true"
				/></a>
				library which implements
				<a href="https://en.wikipedia.org/wiki/Multicore_programming" target="_blank" rel="noopener"
					>multiprocessing <heroicons-outline-external-link class="h-5 w-5 inline-block mb-1" aria-hidden="true"
				/></a>
				to increase the performance of your client, heavily inspired by the Discord.js built-in
				<a href="https://discord.js.org/#/docs/main/stable/class/ShardingManager" target="_blank" rel="noopener"
					>ShardingManager <heroicons-outline-external-link class="h-5 w-5 inline-block mb-1" aria-hidden="true"
				/></a>
			</p>
			<p>
				Using the Node.js
				<a href="https://nodejs.org/api/cluster.html" target="_blank" rel="noopener"
					>cluster <heroicons-outline-external-link class="h-5 w-5 inline-block mb-1" aria-hidden="true"
				/></a>
				module, Discord.js Cluster spreads all
				<a href="https://discord.js.org/#/docs/main/stable/class/ShardingManager" target="_blank" rel="noopener"
					>ShardingManagers <heroicons-outline-external-link class="h-5 w-5 inline-block mb-1" aria-hidden="true"
				/></a>
				evenly among cores, and is easy to implement!
			</p>
		</div>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

import { useStore } from '~/store';
import MainSource from '~/data/MainSource';

import Logo from '~/components/Logo.vue';
import InstallButton from '~/components/InstallButton.vue';

const store = useStore();

const docs = computed(() => store.state.docs);

if (!docs.value) {
	void store.dispatch('fetchDocs', { inputSource: MainSource });
	void store.dispatch('fetchTags', { currentSource: MainSource });
}
</script>
