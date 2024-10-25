import * as React from "react";
import * as SDK from "azure-devops-extension-sdk";
import {
	CommonServiceIds,
	IProjectPageService,
	getClient,
} from "azure-devops-extension-api";
import { GitServiceIds } from "azure-devops-extension-api/Git/GitServices";
import { GitRepository } from "azure-devops-extension-api/Git/Git";
import { GitRestClient } from "azure-devops-extension-api/Git/GitClient";
import {
	ObservableArray,
	ObservableValue,
} from "azure-devops-ui/Core/Observable";
import { Header, TitleSize } from "azure-devops-ui/Header";
import {
	IHeaderCommandBarItem,
	HeaderCommandBarWithFilter,
} from "azure-devops-ui/HeaderCommandBar";
import { Page } from "azure-devops-ui/Page";
import { Surface, SurfaceBackground } from "azure-devops-ui/Surface";
import { Tab, TabBar } from "azure-devops-ui/Tabs";
import { Filter } from "azure-devops-ui/Utilities/Filter";
import { DropdownMultiSelection } from "azure-devops-ui/Utilities/DropdownSelection";
import { showRootComponent } from "../../Common";
import { Card } from "azure-devops-ui/Card";
import { Tree } from "azure-devops-ui/TreeEx";
import {
	ITreeItemProvider,
	ITreeItemEx,
} from "azure-devops-ui/Utilities/TreeItemProvider";
import {
	ColumnSorting,
	ISimpleTableCell,
	renderSimpleCell,
	sortItems,
	SortOrder,
	Table,
  ColumnFill
} from "azure-devops-ui/Table";
import { ISimpleListCell } from "azure-devops-ui/List";

interface IRepoActivityHub {
	projectContext: any;
	selectedTabId: string;
}

//const selectedTabIdObs = new ObservableValue<string>("commits");

const filterToggled = new ObservableValue<boolean>(false);
const filter = new Filter();
const dropdownSelection = new DropdownMultiSelection();

const tabBarCommands: IHeaderCommandBarItem[] = [
	{
		ariaLabel: "Home",
		id: "view-toggle",
		onActivate: () => {
			alert("Toggle View");
		},
		iconProps: {
			iconName: "Home",
		},
		important: true,
		subtle: true,
		tooltipProps: { text: "Home" },
	},
];

const columns = [
	{
		id: "name",
		name: "Repository",
		onSize: onSize,
		readonly: true,
		renderCell: renderSimpleCell,
		sortProps: {
			ariaLabelAscending: "Sorted A to Z",
			ariaLabelDescending: "Sorted Z to A",
		},
		width: new ObservableValue(-30),
	},
	{
		id: "age",
		maxWidth: 300,
		name: "Age",
		onSize: onSize,
		readonly: true,
		renderCell: renderSimpleCell,
		sortProps: {
			ariaLabelAscending: "Sorted low to high",
			ariaLabelDescending: "Sorted high to low",
		},
		width: new ObservableValue(-30),
	},
	{
		id: "gender",
		name: "Gender",
		width: new ObservableValue(-40),
		readonly: true,
		renderCell: renderSimpleCell,
	},
];

// Create the sorting behavior (delegate that is called when a column is sorted).
const sortingBehavior = new ColumnSorting<ITableItem>(
	(
		columnIndex: number,
		proposedSortOrder: SortOrder,
		event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>
	) => {
		tableItems.splice(
			0,
			tableItems.length,
			...sortItems<ITableItem>(
				columnIndex,
				proposedSortOrder,
				sortFunctions,
				columns,
				rawTableItems
			)
		);
	}
);

const rawTableItems: ITableItem[] = [
	{
		age: 50,
		gender: "M",
		name: { text: "Rory Boisvert" },
	},
	{
		age: 49,
		gender: "F",
		name: { text: "Sharon Monroe" },
	},
	{
		age: 18,
		gender: "F",
		name: { text: "Lucy Booth" },
	},
];

interface ITableItem extends ISimpleTableCell {
	name: ISimpleListCell;
	age: number;
	gender: string;
}

interface ILocationTableItem extends ISimpleTableCell {
	city: string;
	continent: ISimpleListCell;
	country: string;
	name: string;
	server: string;
	state: string;
}

const sortFunctions = [
	// Sort on Name column
	(item1: ITableItem, item2: ITableItem): number => {
		return item1.name.text!.localeCompare(item2.name.text!);
	},

	// Sort on Age column
	(item1: ITableItem, item2: ITableItem): number => {
		return item1.age - item2.age;
	},

	// Gender column does not need a sort function
	null,
];

const sizableColumns = [
  {
      id: "name",
      name: "Name",
      minWidth: 50,
      width: new ObservableValue(300),
      renderCell: renderSimpleCell,
  },
  {
      id: "calories",
      name: "Calories",
      maxWidth: 300,
      width: new ObservableValue(200),
      renderCell: renderSimpleCell,
  },
  { id: "cost", name: "Cost", width: new ObservableValue(200), renderCell: renderSimpleCell },
  ColumnFill
];

// Initialize our table items with the declared items sorted by the Name column ascending.
const tableItems = new ObservableArray<ITableItem>(rawTableItems);

function onSize(event: MouseEvent, index: number, width: number) {
	(columns[index].width as ObservableValue<number>).value = width;
}

class RepoActivityHub extends React.Component<{}, IRepoActivityHub> {
	constructor(props: {}) {
		super(props);
		this.state = { projectContext: undefined, selectedTabId: "commits" };
		//selectedTabIdObs.subscribe((newTabId) => { this.setState({ selectedTabId: newTabId }); });
	}

	public componentDidMount() {
		try {
			console.log("Component did mount, initializing SDK...");
			SDK.init();

			SDK.ready()
				.then(() => {
					console.log("SDK is ready, loading project context...");
					this.loadProjectContext();
					// this.loadProjects();
				})
				.catch((error) => {
					console.error("SDK ready failed: ", error);
				});
		} catch (error) {
			console.error(
				"Error during SDK initialization or project context loading: ",
				error
			);
		}
	}

	public render() {
		return (
			<Surface background={SurfaceBackground.neutral}>
				<Page className="repo-activity-page flex-grow">
					<Header title="Repository Activity" titleSize={TitleSize.Large} />
					<TabBar
						selectedTabId={this.state.selectedTabId}
						onSelectedTabChanged={this.onSelectedTabChanged}
						renderAdditionalContent={this.renderTabBarCommands}
						disableSticky={false}
					>
						<Tab id="commits" name="Commits" />
						<Tab id="pullRequests" name="Pull Requests" />
					</TabBar>
					{this.renderFilterBarInContent()}
					{this.getPageContent()}
				</Page>
			</Surface>
		);
	}

	private renderFilterBarInContent = () => {
		return null;
	};

	private getPageContent() {
		if (this.state.selectedTabId === "commits") {
			return (
				<>
					<Table<ITableItem>
						ariaLabel="Table with sorting"
						behaviors={[sortingBehavior]}
						className="table-example"
						columns={columns}
						containerClassName="h-scroll-auto"
						itemProvider={tableItems}
						role="table"
					/>
          <Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 1", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
          <br /><br /><br />
          <Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 2", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
          <br /><br /><br />
          <Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 3", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
				</>
			);
		} else if (this.state.selectedTabId === "pullRequests") {
			return (
				<>
					<Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 1", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
          <Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 2", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
          <Card
						className="flex-grow bolt-table-card"
						titleProps={{ text: "Repo 3", ariaLevel: 3 }}
					>
						<Table<Partial<ITableItem>>
							ariaLabel="Food Inventory Table"
							columns={sizableColumns}
							itemProvider={tableItems}
						/>
					</Card>
				</>
			);
		}
		return null;
	}

	private onFilterBarDismissClicked = () => {
		filterToggled.value = !filterToggled.value;
	};

	private renderTabBarCommands = () => {
		return (
			<HeaderCommandBarWithFilter
				filter={filter}
				filterToggled={filterToggled}
				items={tabBarCommands}
			/>
		);
	};

	private onSelectedTabChanged = (newTabId: string) => {
		//selectedTabIdObs.notify(newTabId, newTabId);
	};

	private async loadProjectContext(): Promise<void> {
		try {
			const client = await SDK.getService<IProjectPageService>(
				CommonServiceIds.ProjectPageService
			);
			const context = await client.getProject();

			this.setState({ projectContext: context });

			const client2: GitRestClient = getClient(GitRestClient);
			console.log(context);
			var projectId = context?.id;
			console.log(this.state.projectContext);
			const repositories = await client2.getRepositories(projectId);
			console.log("Repositories: ", repositories);

			SDK.notifyLoadSucceeded();
		} catch (error) {
			console.error("Failed to load project context: ", error);
		}
	}
}

showRootComponent(<RepoActivityHub />);
